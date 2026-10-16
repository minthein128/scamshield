import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import * as ShieldModule from 'shield-module';
import type { MessageGuardApp, MessageGuardLogEntry } from 'shield-module';
import { t } from '../i18n';
import { useApiUrl } from '../config/runtime';
import { useAppState } from '../state/AppState';
import { shieldSupport, type ShieldSupport } from './useShieldControl';

/** What the consent screen asks for: turning Message Guard on, or adding one more app. */
export type MessageGuardConsentRequest = { mode: 'enable' } | { mode: 'addApp'; app: MessageGuardApp };

export interface MessageGuardControl {
  support: ShieldSupport;
  enabled: boolean;
  access: boolean;
  apps: MessageGuardApp[];
  error: string | null;
  pausedReason: string | null;
  consent: MessageGuardConsentRequest | null;
  setEnabled: (on: boolean) => Promise<void>;
  confirmConsent: (appIds: string[]) => Promise<void>;
  cancelConsent: () => void;
  toggleApp: (id: string) => Promise<void>;
  turnOffAndRevoke: () => Promise<void>;
}

/** Keeps the background listener's server address, language, notice text and signal sharing opt-in current. */
export function useMessageGuardConfigSync(): void {
  const { language, profile, ready } = useAppState();
  const apiUrl = useApiUrl();
  const shareSignals = profile.shareSignals === true;
  useEffect(() => {
    if (Platform.OS !== 'android' || !apiUrl) return;
    ShieldModule.configureMessageGuard({
      apiUrl,
      language,
      // Native sharing stays off until the stored opt-in has loaded.
      ...(ready ? { shareSignals } : {}),
      noticeBody: t('shield:messageGuard.notice.body'),
      noticeOpen: t('shield:messageGuard.notice.open'),
    }).catch(() => undefined);
  }, [apiUrl, language, ready, shareSignals]);
}

export function useMessageGuard(): MessageGuardControl {
  const apiUrl = useApiUrl();
  const support = shieldSupport(Platform.OS, apiUrl);
  const [on, setOn] = useState(false);
  const [access, setAccess] = useState(false);
  const [apps, setApps] = useState<MessageGuardApp[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pausedReason, setPausedReason] = useState<string | null>(null);
  const [consent, setConsent] = useState<MessageGuardConsentRequest | null>(null);
  const awaitingAccess = useRef(false);

  const refresh = useCallback(async () => {
    if (support !== 'ready') return;
    const [status, granted, list] = await Promise.all([
      ShieldModule.getMessageGuardStatus(),
      ShieldModule.hasNotificationAccess(),
      ShieldModule.getMessageGuardApps(),
    ]);
    setOn(status.enabled);
    setPausedReason(status.pausedReason);
    setAccess(granted);
    setApps(list);
  }, [support]);

  const turnOn = useCallback(async () => {
    if (Number(Platform.Version) >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    await ShieldModule.setMessageGuardEnabled(true);
    setError(null);
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh().catch(() => undefined);
    if (support !== 'ready') return;
    const sub = AppState.addEventListener('change', async state => {
      if (state !== 'active') return;
      await refresh().catch(() => undefined);
      if (!awaitingAccess.current) return;
      awaitingAccess.current = false;
      if (await ShieldModule.hasNotificationAccess()) {
        await turnOn().catch(() => undefined);
      } else {
        await ShieldModule.setMessageGuardEnabled(false);
        await refresh().catch(() => undefined);
        setError(t('shield:messageGuard.errors.accessOff'));
      }
    });
    return () => sub.remove();
  }, [refresh, support, turnOn]);

  const turnOff = useCallback(async () => {
    awaitingAccess.current = false;
    await ShieldModule.setMessageGuardEnabled(false);
    await refresh();
  }, [refresh]);

  const setEnabled = useCallback(
    async (next: boolean) => {
      if (support !== 'ready') return;
      setError(null);
      if (!next) {
        await turnOff();
        return;
      }
      const status = await ShieldModule.getMessageGuardStatus();
      if (status.pausedReason && status.consent && (await ShieldModule.hasNotificationAccess())) {
        await turnOn();
        return;
      }
      setConsent({ mode: 'enable' });
    },
    [support, turnOff, turnOn],
  );

  const confirmConsent = useCallback(
    async (appIds: string[]) => {
      const request = consent;
      setConsent(null);
      if (!request || appIds.length === 0) return;
      if (request.mode === 'addApp') {
        const current = apps.filter(a => a.enabled).map(a => a.id);
        await ShieldModule.grantMessageGuardConsent([...new Set([...current, ...appIds])]);
        await refresh();
        return;
      }
      if (!(await ShieldModule.grantMessageGuardConsent(appIds))) return;
      if (!(await ShieldModule.hasNotificationAccess())) {
        awaitingAccess.current = true;
        if (!(await ShieldModule.openNotificationAccessSettings())) {
          awaitingAccess.current = false;
          await ShieldModule.setMessageGuardEnabled(false);
          setError(t('shield:messageGuard.errors.cannotOpen'));
        }
        return;
      }
      await turnOn();
    },
    [apps, consent, refresh, turnOn],
  );

  const cancelConsent = useCallback(() => setConsent(null), []);

  const toggleApp = useCallback(
    async (id: string) => {
      const app = apps.find(a => a.id === id);
      if (!app) return;
      if (!app.enabled) {
        setConsent({ mode: 'addApp', app });
        return;
      }
      const next = apps.map(a => (a.id === id ? { ...a, enabled: false } : a));
      setApps(next);
      await ShieldModule.setMessageGuardApps(next.filter(a => a.enabled).map(a => a.id));
      await refresh();
    },
    [apps, refresh],
  );

  const turnOffAndRevoke = useCallback(async () => {
    setError(null);
    await turnOff();
    if (!(await ShieldModule.openNotificationAccessSettings())) setError(t('shield:messageGuard.errors.cannotOpen'));
  }, [turnOff]);

  return {
    support,
    enabled: on && access,
    access,
    apps,
    error,
    pausedReason,
    consent,
    setEnabled,
    confirmConsent,
    cancelConsent,
    toggleApp,
    turnOffAndRevoke,
  };
}

export interface MessageGuardLogControl {
  entries: MessageGuardLogEntry[];
  loading: boolean;
  reload: () => Promise<void>;
  deleteAll: () => Promise<void>;
}

/** The on-device record of what Message Guard sent. Never synced. */
export function useMessageGuardLog(active: boolean): MessageGuardLogControl {
  const [entries, setEntries] = useState<MessageGuardLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await ShieldModule.getMessageGuardLog());
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAll = useCallback(async () => {
    await ShieldModule.clearMessageGuardLog();
    setEntries([]);
  }, []);

  useEffect(() => {
    if (active) reload().catch(() => undefined);
  }, [active, reload]);

  return { entries, loading, reload, deleteAll };
}
