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
  'verdictSafe',
  'verdictCareful',
  'verdictDanger',
  'chipOffline',
  'chipRateLimited',
  'chipBusy',
  'chipNotChecked',
  'tapToRetry',
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
  'end',
  'endA11y',
  'captionHint',
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

/** One messaging app Message Guard can watch. Nothing is on until the user picks it. */
export interface MessageGuardApp {
  id: string;
  label: string;
  enabled: boolean;
  /** The phone's SMS app. Listed first. */
  recommended?: boolean;
}

export interface MessageGuardConfig {
  apiUrl?: string;
  language?: 'en' | 'id' | 'tl' | 'my' | 'th';
  shareSignals?: boolean;
  /** Neutral notification body in the user's language. */
  noticeBody?: string;
  /** Notification button label in the user's language. */
  noticeOpen?: string;
}

export interface MessageGuardStatus {
  enabled: boolean;
  /** The user agreed to the current consent text for the chosen apps. */
  consent: boolean;
  /** Set when Message Guard paused itself, for example 'daily_limit'. */
  pausedReason: string | null;
}

/** One check Message Guard sent, kept on the phone only. */
export interface MessageGuardLogEntry {
  id: string;
  /** Epoch milliseconds. */
  at: number;
  app: string;
  /** The exact redacted text that left the phone. */
  text: string;
  verdict: 'pending' | 'failed' | 'safe' | 'careful' | 'danger' | string;
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
  hasNotificationAccess(): Promise<boolean>;
  openNotificationAccessSettings(): Promise<boolean>;
  setMessageGuardEnabled(enabled: boolean): Promise<boolean>;
  isMessageGuardEnabled(): Promise<boolean>;
  setMessageGuardApps(ids: string[]): Promise<boolean>;
  getMessageGuardApps(): Promise<MessageGuardApp[]>;
  configureMessageGuard(config: MessageGuardConfig): Promise<boolean>;
  getMessageGuardStatus(): Promise<MessageGuardStatus | null>;
  grantMessageGuardConsent(ids: string[]): Promise<boolean>;
  getMessageGuardLog(): Promise<MessageGuardLogEntry[]>;
  clearMessageGuardLog(): Promise<boolean>;
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
let mockNotificationAccess = false;
let mockGuardEnabled = false;
let mockGuardConsent: string[] = [];
const MOCK_GUARD_APPS: MessageGuardApp[] = [
  { id: 'messages', label: 'Google Messages', enabled: false, recommended: true },
  { id: 'whatsapp', label: 'WhatsApp', enabled: false },
  { id: 'viber', label: 'Viber', enabled: false },
  { id: 'telegram', label: 'Telegram', enabled: false },
  { id: 'line', label: 'LINE', enabled: false },
  { id: 'messenger', label: 'Messenger', enabled: false },
  { id: 'zalo', label: 'Zalo', enabled: false },
  { id: 'signal', label: 'Signal', enabled: false },
];
let mockGuardApps: MessageGuardApp[] = MOCK_GUARD_APPS.map(a => ({ ...a }));
let mockGuardLog: MessageGuardLogEntry[] = [];
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

/** True when the user has granted SafeRoute notification access in system Settings. */
export async function hasNotificationAccess(): Promise<boolean> {
  if (nativeShieldModule) {
    try {
      return await nativeShieldModule.hasNotificationAccess();
    } catch {
      return false;
    }
  }
  return mockNotificationAccess;
}

/** Opens the system notification access screen. The user turns SafeRoute on there. */
export async function openNotificationAccessSettings(): Promise<boolean> {
  if (nativeShieldModule) {
    try {
      return await nativeShieldModule.openNotificationAccessSettings();
    } catch {
      return false;
    }
  }
  mockNotificationAccess = true;
  return true;
}

/**
 * Turns Message Guard on or off. Turning on needs consent from grantMessageGuardConsent() first and
 * returns false without it. Turning off withdraws consent. It reads nothing while off.
 */
export async function setMessageGuardEnabled(enabled: boolean): Promise<boolean> {
  if (nativeShieldModule) {
    try {
      return await nativeShieldModule.setMessageGuardEnabled(enabled);
    } catch {
      return false;
    }
  }
  if (enabled && mockGuardConsent.length === 0) return false;
  mockGuardEnabled = enabled;
  if (!enabled) {
    mockGuardConsent = [];
    mockGuardApps = mockGuardApps.map(a => ({ ...a, enabled: false }));
  }
  return true;
}

/** Records the user's consent for exactly these apps. Adding an app later needs a new call. */
export async function grantMessageGuardConsent(ids: string[]): Promise<boolean> {
  if (nativeShieldModule) {
    try {
      return await nativeShieldModule.grantMessageGuardConsent(ids);
    } catch {
      return false;
    }
  }
  const known = ids.filter(id => mockGuardApps.some(a => a.id === id));
  if (known.length === 0) return false;
  mockGuardConsent = known;
  mockGuardApps = mockGuardApps.map(a => ({ ...a, enabled: known.includes(a.id) }));
  return true;
}

export async function getMessageGuardStatus(): Promise<MessageGuardStatus> {
  const off: MessageGuardStatus = { enabled: false, consent: false, pausedReason: null };
  if (nativeShieldModule) {
    try {
      return (await nativeShieldModule.getMessageGuardStatus()) ?? off;
    } catch {
      return off;
    }
  }
  return { enabled: mockGuardEnabled, consent: mockGuardConsent.length > 0, pausedReason: null };
}

/** What Message Guard sent in the last seven days, newest first. Stored on the phone only. */
export async function getMessageGuardLog(): Promise<MessageGuardLogEntry[]> {
  if (nativeShieldModule) {
    try {
      return await nativeShieldModule.getMessageGuardLog();
    } catch {
      return [];
    }
  }
  return mockGuardLog.map(e => ({ ...e }));
}

export async function clearMessageGuardLog(): Promise<boolean> {
  if (nativeShieldModule) {
    try {
      return await nativeShieldModule.clearMessageGuardLog();
    } catch {
      return false;
    }
  }
  mockGuardLog = [];
  return true;
}

export async function isMessageGuardEnabled(): Promise<boolean> {
  if (nativeShieldModule) {
    try {
      return await nativeShieldModule.isMessageGuardEnabled();
    } catch {
      return false;
    }
  }
  return mockGuardEnabled;
}

/** Narrows the watched apps. An app outside the current consent is ignored; add it with grantMessageGuardConsent(). */
export async function setMessageGuardApps(ids: string[]): Promise<boolean> {
  if (nativeShieldModule) {
    try {
      return await nativeShieldModule.setMessageGuardApps(ids);
    } catch {
      return false;
    }
  }
  mockGuardConsent = mockGuardConsent.filter(id => ids.includes(id));
  mockGuardApps = mockGuardApps.map(a => ({ ...a, enabled: mockGuardConsent.includes(a.id) }));
  return true;
}

export async function getMessageGuardApps(): Promise<MessageGuardApp[]> {
  if (nativeShieldModule) {
    try {
      return await nativeShieldModule.getMessageGuardApps();
    } catch {
      return [];
    }
  }
  return mockGuardApps.map(a => ({ ...a }));
}

/** Stores the server address, language and signal sharing choice the background listener uses. */
export async function configureMessageGuard(config: MessageGuardConfig): Promise<boolean> {
  if (!nativeShieldModule) return true;
  try {
    return await nativeShieldModule.configureMessageGuard(config);
  } catch {
    return false;
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
  hasNotificationAccess,
  openNotificationAccessSettings,
  setMessageGuardEnabled,
  isMessageGuardEnabled,
  setMessageGuardApps,
  getMessageGuardApps,
  configureMessageGuard,
  getMessageGuardStatus,
  grantMessageGuardConsent,
  getMessageGuardLog,
  clearMessageGuardLog,
};
