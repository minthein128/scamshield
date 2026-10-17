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
const listeners = new Set<() => void>();
let nativeSub: ShieldModule.ShieldSubscription | null = null;

function emit(next: ShieldState) {
  if (next.running === state.running && next.transition === state.transition) return;
  state = next;
  listeners.forEach(l => l());
}

function writeRunning(running: boolean) {
  version += 1;
  emit({ ...state, running });
}

export function getShieldState(): ShieldState {
  return state;
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

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Re-reads until the service reports the target or the timeout passes, then keeps the last read. */
async function settle(target: boolean, since: number): Promise<boolean> {
  const deadline = Date.now() + SETTLE_TIMEOUT_MS;
  for (;;) {
    const running = await ShieldModule.isShieldRunning();
    if (running === target || Date.now() >= deadline) {
      writeRunning(running);
      return running;
    }
    if (version !== since && state.running === target) return target;
    await sleep(SETTLE_INTERVAL_MS);
  }
}

/**
 * Runs a native start or stop and holds the transition until the service confirms it.
 * Returns the confirmed running state, or null when another start or stop is in progress.
 */
export async function runShieldTransition(transition: 'starting' | 'stopping', action: () => Promise<boolean>): Promise<boolean | null> {
  if (state.transition) return null;
  emit({ ...state, transition });
  const since = version;
  try {
    if (!(await action())) return await refreshShieldState();
    return await settle(transition === 'starting', since);
  } finally {
    emit({ ...state, transition: null });
  }
}
