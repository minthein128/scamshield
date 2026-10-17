import * as ShieldModule from 'shield-module';

/** Whether the floating shield runs, shared by every screen that shows or toggles it. */
export type ShieldTransition = 'starting' | 'stopping' | null;

export interface ShieldState {
  running: boolean;
  transition: ShieldTransition;
}

export const SETTLE_INTERVAL_MS = 100;
export const SETTLE_TIMEOUT_MS = 4000;

let state: ShieldState = { running: false, transition: null };
let version = 0;
let since = 0;
const listeners = new Set<() => void>();
const writeWaiters = new Set<() => void>();
let nativeSub: ShieldModule.ShieldSubscription | null = null;

function emit(next: ShieldState) {
  if (next.running === state.running && next.transition === state.transition) return;
  state = next;
  listeners.forEach(l => l());
}

function writeRunning(running: boolean) {
  version += 1;
  emit({ ...state, running });
  writeWaiters.forEach(w => w());
}

export function getShieldState(): ShieldState {
  return state;
}

/** What the controls show: the target of a start or stop in progress, otherwise the confirmed state. */
export function shieldShownOn(s: ShieldState): boolean {
  if (s.transition === 'starting') return true;
  if (s.transition === 'stopping') return false;
  return s.running;
}

export function subscribeShieldState(listener: () => void): () => void {
  listeners.add(listener);
  if (!nativeSub) nativeSub = ShieldModule.addShieldStateListener(writeRunning);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && nativeSub) {
      nativeSub.remove();
      nativeSub = null;
    }
  };
}

/** Reads the service state. A read that started before a newer write is dropped. */
export async function refreshShieldState(): Promise<boolean> {
  const seen = version;
  const running = await ShieldModule.isShieldRunning();
  if (seen === version) writeRunning(running);
  return state.running;
}

/** Resolves on the next state write (native event or read), or after [ms]. */
function nextWrite(ms: number): Promise<void> {
  return new Promise(resolve => {
    const done = () => {
      clearTimeout(timer);
      writeWaiters.delete(done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    writeWaiters.add(done);
  });
}

/** Re-reads until the service reports the target or the timeout passes, then keeps the last read. */
async function settle(target: boolean): Promise<boolean> {
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  for (;;) {
    if (version !== since && state.running === target) return target;
    const running = await ShieldModule.isShieldRunning();
    if (running === target || Date.now() >= deadline) {
      writeRunning(running);
      return running;
    }
    await nextWrite(SETTLE_INTERVAL_MS);
  }
}

/**
 * Shows a start or stop at once, before any permission check or native call.
 * Returns false when another start or stop is in progress.
 */
export function beginShieldTransition(transition: 'starting' | 'stopping'): boolean {
  if (state.transition) return false;
  since = version;
  emit({ ...state, transition });
  return true;
}

/** Drops the transition and shows the confirmed state again (a declined permission or a failure). */
export function cancelShieldTransition(): void {
  emit({ ...state, transition: null });
}

/** Runs the native start or stop of the current transition and holds it until the service confirms. */
export async function confirmShieldTransition(action: () => Promise<boolean>): Promise<boolean> {
  const target = state.transition === 'starting';
  try {
    if (!(await action())) return await refreshShieldState();
    return await settle(target);
  } finally {
    cancelShieldTransition();
  }
}

/**
 * Runs a native start or stop and holds the transition until the service confirms it.
 * Returns the confirmed running state, or null when another start or stop is in progress.
 */
export async function runShieldTransition(transition: 'starting' | 'stopping', action: () => Promise<boolean>): Promise<boolean | null> {
  if (!beginShieldTransition(transition)) return null;
  return confirmShieldTransition(action);
}
