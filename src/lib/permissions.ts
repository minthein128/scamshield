import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform, type Permission } from 'react-native';

export type PermissionKind = 'mic' | 'overlay' | 'notifications' | 'contacts';
export type HelpKind = 'mic' | 'overlay' | 'contacts';
export type PermissionResult = 'granted' | 'declined' | 'denied' | 'blocked';

interface Host {
  explain: (kind: PermissionKind) => Promise<boolean>;
  help: (kind: HelpKind) => void;
}

let host: Host | null = null;
export const EXPLAINED_KEY = 'saferoute.permissions.explained.v1';

export function registerPermissionHost(next: Host): () => void {
  host = next;
  return () => {
    if (host === next) host = null;
  };
}

/** Resolves true when the user taps Continue. With no host mounted (tests, headless) it resolves true. */
export function explainPermission(kind: PermissionKind): Promise<boolean> {
  return host ? host.explain(kind) : Promise.resolve(true);
}

async function explainedKinds(): Promise<string[]> {
  try {
    const list: unknown = JSON.parse((await AsyncStorage.getItem(EXPLAINED_KEY)) ?? '[]');
    return Array.isArray(list) ? list.filter((k): k is string => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

/** Explains once per install, for optional permissions. Later calls resolve false. */
export async function explainOnceEver(kind: PermissionKind): Promise<boolean> {
  const list = await explainedKinds();
  if (list.includes(kind)) return false;
  const ok = await explainPermission(kind);
  await AsyncStorage.setItem(EXPLAINED_KEY, JSON.stringify([...list, kind])).catch(() => undefined);
  return ok;
}

export function showPermissionHelp(kind: HelpKind): void {
  host?.help(kind);
}

export interface AndroidPermissionApi {
  platform: string;
  version: number | string;
  check: (p: Permission) => Promise<boolean>;
  request: (p: Permission) => Promise<string>;
  explain: (kind: PermissionKind) => Promise<boolean>;
}

export const permissionApi = (overrides: Partial<AndroidPermissionApi> = {}): AndroidPermissionApi => ({
  platform: Platform.OS,
  version: Platform.Version,
  check: p => PermissionsAndroid.check(p),
  request: p => PermissionsAndroid.request(p),
  explain: explainPermission,
  ...overrides,
});

/** Check, then explain, then show the system dialog. Never prompts when already granted. */
export async function ensureAndroidPermission(
  kind: PermissionKind,
  permission: Permission,
  api: AndroidPermissionApi = permissionApi(),
): Promise<PermissionResult> {
  if (api.platform !== 'android') return (await api.explain(kind)) ? 'granted' : 'declined';
  if (await api.check(permission).catch(() => false)) return 'granted';
  if (!(await api.explain(kind))) return 'declined';
  const answer = await api.request(permission).catch(() => 'denied');
  if (answer === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
  return answer === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ? 'blocked' : 'denied';
}

export const ensureMicrophone = (api?: AndroidPermissionApi) =>
  ensureAndroidPermission('mic', PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, api);

/** Asks only on Android 13+. The shield still runs when this is refused. */
export async function ensureNotifications(api: AndroidPermissionApi = permissionApi()): Promise<PermissionResult> {
  if (api.platform !== 'android' || Number(api.version) < 33) return 'granted';
  return ensureAndroidPermission('notifications', PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS, api);
}

export const ensureContacts = (api?: AndroidPermissionApi) =>
  ensureAndroidPermission('contacts', PermissionsAndroid.PERMISSIONS.READ_CONTACTS, api);
