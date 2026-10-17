import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

export type ShieldVerdict = 'safe' | 'careful' | 'danger';

export interface ShieldFlag {
  family: string;
  label: string;
  evidence?: string;
  severity: 'low' | 'medium' | 'high';
}

/** Response of POST /v1/check (docs/api-contract.md). */
export interface ShieldCheckResult {
  id: string;
  createdAt: string;
  kind: string;
  verdict: ShieldVerdict;
  score: number;
  title: string;
  summary: string;
  spokenWarning?: string;
  scamType?: string;
  flags: ShieldFlag[];
  linkChecks?: unknown[];
  actions?: unknown[];
  model?: string;
}

/** Labels the overlay shows: verdict and error chips, card buttons and the voice companion. Missing keys fall back to English. */
export const COMPANION_STRING_KEYS = [
  'name',
  'appName',
  'verdictSafe',
  'verdictCareful',
  'verdictDanger',
  'chipOffline',
  'chipRateLimited',
  'chipBusy',
  'chipNotChecked',
  'tapToRetry',
  'a11yShield',
  'a11yCheckScreen',
  'a11yChecking',
  'a11yShowDetails',
  'a11yExpanded',
  'errNoConnection',
  'errTooMany',
  'errBusy',
  'errTooLarge',
  'errCapture',
  'errCaptureDenied',
  'errFailed',
  'dismiss',
  'fullReport',
  'showDetails',
  'closeShield',
  'ask',
  'whatWeChecked',
  'previewClose',
  'askA11y',
  'talkA11y',
  'listening',
  'muted',
  'paused',
  'thinking',
  'speaking',
  'checking',
  'warning',
  'rechecking',
  'connecting',
  'endA11y',
  'voiceChip',
  'micDenied',
  'needsForeground',
  'unavailable',
  'rateLimited',
  'busy',
  'notFound',
  'endedCap',
  'muteA11y',
  'unmuteA11y',
] as const;

export type CompanionStringKey = (typeof COMPANION_STRING_KEYS)[number];

export interface ShieldStartOptions {
  /** Defaults to EXPO_PUBLIC_API_URL. */
  apiUrl?: string;
  language?: 'en' | 'id' | 'tl' | 'my' | 'th';
  /** Firebase ID token sent as a Bearer header. Optional; without it the server limits by IP. */
  authToken?: string;
  /** ISO country codes from the profile; the voice companion uses them to pick verified hotlines. */
  home?: string;
  destination?: string;
  /** The user's opt-in to share scam patterns from screen checks. Native treats a missing value as false. */
  shareSignals?: boolean;
  /** Voice companion labels in the user's language. */
  strings?: Partial<Record<CompanionStringKey, string>>;
}

export interface ShieldSubscription {
  remove(): void;
}

interface ShieldModuleType {
  hasOverlayPermission(): Promise<boolean>;
  requestOverlayPermission(): Promise<boolean>;
  requestScreenCapturePermission(): Promise<boolean>;
  startShield(options?: ShieldStartOptions): Promise<boolean>;
  setAuthToken(token: string | null): Promise<boolean>;
  setShareSignals(enabled: boolean): Promise<boolean>;
  stopShield(): Promise<boolean>;
  isShieldRunning(): Promise<boolean>;
  checkScreenNow(): Promise<void>;
  getShieldResult(id: string): Promise<string | null>;
  takeUnsyncedResults(): Promise<string[]>;
  addListener(
    event: 'onShieldResult',
    listener: (e: { id: string; json: string }) => void
  ): ShieldSubscription;
}

let nativeShieldModule: ShieldModuleType | null = null;

if (Platform.OS === 'android') {
  try {
    nativeShieldModule = requireNativeModule('ShieldModule');
  } catch (e) {
    console.warn('[ShieldModule] Native module not loaded, using fallback mock:', e);
  }
}

const MOCK_RESULT: ShieldCheckResult = {
  id: 'chk_mock_0001',
  createdAt: '2026-01-01T00:00:00.000Z',
  kind: 'screen',
  verdict: 'danger',
  score: 88,
  title: 'This looks like a job scam',
  summary: 'The chat asks you to pay a fee before you start work and to move to a private app.',
  spokenWarning: 'Stop. This looks like a job scam. Do not pay anything.',
  scamType: 'job_trafficking',
  flags: [
    { family: 'payment_route', label: 'Fee before work', evidence: 'Send 5,000 baht for your visa first', severity: 'high' },
    { family: 'pressure', label: 'Rush', evidence: 'Reply in 10 minutes or lose the job', severity: 'medium' },
    { family: 'too_good', label: 'Pay too high', evidence: '$3,000 a month, no experience', severity: 'medium' },
  ],
  model: 'mock',
};

let mockRunning = false;
let mockOverlayGranted = false;
let mockCaptureGranted = false;
const mockListeners = new Set<(r: ShieldCheckResult) => void>();

export async function hasOverlayPermission(): Promise<boolean> {
  if (nativeShieldModule) {
    try {
      return await nativeShieldModule.hasOverlayPermission();
    } catch {
      return false;
    }
  }
  return mockOverlayGranted;
}

export async function requestOverlayPermission(): Promise<boolean> {
  if (nativeShieldModule) {
    try {
      return await nativeShieldModule.requestOverlayPermission();
    } catch {
      return false;
    }
  }
  mockOverlayGranted = true;
  return true;
}

/** Shows the system screen-capture consent dialog. Resolves true when the user allows. */
export async function requestScreenCapturePermission(): Promise<boolean> {
  if (nativeShieldModule) {
    try {
      return await nativeShieldModule.requestScreenCapturePermission();
    } catch {
      return false;
    }
  }
  mockCaptureGranted = true;
  return true;
}

export async function startShield(options?: ShieldStartOptions): Promise<boolean> {
  if (nativeShieldModule) {
    try {
      const apiUrl = options?.apiUrl || process.env.EXPO_PUBLIC_API_URL || '';
      return await nativeShieldModule.startShield({ ...options, apiUrl });
    } catch (e) {
      console.warn('Native startShield error:', e);
      return false;
    }
  }
  mockRunning = true;
  return true;
}

/** Updates the running shield's scam-pattern sharing choice. Off unless the user opted in. */
export async function setShieldShareSignals(enabled: boolean): Promise<boolean> {
  if (!nativeShieldModule) return true;
  try {
    return await nativeShieldModule.setShareSignals(enabled);
  } catch {
    return false;
  }
}

/** Replaces the token used by the running shield. Call it when the ID token refreshes. */
export async function setShieldAuthToken(token: string | null): Promise<boolean> {
  if (!nativeShieldModule) return true;
  try {
    return await nativeShieldModule.setAuthToken(token);
  } catch {
    return false;
  }
}

export async function stopShield(): Promise<boolean> {
  if (nativeShieldModule) {
    try {
      return await nativeShieldModule.stopShield();
    } catch (e) {
      console.warn('Native stopShield error:', e);
      return false;
    }
  }
  mockRunning = false;
  return true;
}

export async function isShieldRunning(): Promise<boolean> {
  if (nativeShieldModule) {
    try {
      return await nativeShieldModule.isShieldRunning();
    } catch {
      return false;
    }
  }
  return mockRunning;
}

/** Same as tapping the bubble. The result arrives through addShieldResultListener. */
export async function checkScreenNow(): Promise<void> {
  if (nativeShieldModule) {
    await nativeShieldModule.checkScreenNow();
    return;
  }
  if (!mockRunning) throw new Error('Shield is not running');
  setTimeout(() => {
    const result = { ...MOCK_RESULT, createdAt: new Date().toISOString() };
    mockListeners.forEach((cb) => cb(result));
  }, 800);
}

export function addShieldResultListener(
  callback: (result: ShieldCheckResult) => void
): ShieldSubscription {
  if (nativeShieldModule) {
    return nativeShieldModule.addListener('onShieldResult', (e) => {
      try {
        callback(JSON.parse(e.json) as ShieldCheckResult);
      } catch (err) {
        console.warn('[ShieldModule] Bad result payload:', err);
      }
    });
  }
  mockListeners.add(callback);
  return { remove: () => mockListeners.delete(callback) };
}

/** Result of a recent check by id, for the saferoute://report/<id> deep link. */
export async function getShieldResult(id: string): Promise<ShieldCheckResult | null> {
  if (nativeShieldModule) {
    try {
      const json = await nativeShieldModule.getShieldResult(id);
      return json ? (JSON.parse(json) as ShieldCheckResult) : null;
    } catch {
      return null;
    }
  }
  return id === MOCK_RESULT.id ? MOCK_RESULT : null;
}

/** Results produced while no JS listener was attached. Call on app start, then save them. */
export async function takeUnsyncedResults(): Promise<ShieldCheckResult[]> {
  if (!nativeShieldModule) return [];
  try {
    const list = await nativeShieldModule.takeUnsyncedResults();
    return list.map((json) => JSON.parse(json) as ShieldCheckResult);
  } catch {
    return [];
  }
}

export default {
  hasOverlayPermission,
  requestOverlayPermission,
  requestScreenCapturePermission,
  startShield,
  setShieldAuthToken,
  setShieldShareSignals,
  stopShield,
  isShieldRunning,
  checkScreenNow,
  addShieldResultListener,
  getShieldResult,
  takeUnsyncedResults,
};
