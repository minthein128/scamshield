import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import * as ShieldModule from 'shield-module';
import type { MessageGuardApp } from 'shield-module';
import { t } from '../i18n';
import { useApiUrl } from '../config/runtime';
import { useAppState } from '../state/AppState';
import { shieldSupport, type ShieldSupport } from './useShieldControl';

export interface MessageGuardControl {
  support: ShieldSupport;
  enabled: boolean;
  access: boolean;
  apps: MessageGuardApp[];
  error: string | null;
  setEnabled: (on: boolean) => Promise<void>;
  toggleApp: (id: string) => Promise<void>;
}

/** Keeps the background listener's server address, language and signal sharing choice current. */
export function useMessageGuardConfigSync(): void {
  const { language, profile } = useAppState();
  const apiUrl = useApiUrl();
  const shareSignals = profile.shareSignals;
  useEffect(() => {
    if (Platform.OS !== 'android' || !apiUrl) return;
    ShieldModule.configureMessageGuard({ apiUrl, language, shareSignals }).catch(() => undefined);
  }, [apiUrl, language, shareSignals]);
}

export function useMessageGuard(): MessageGuardControl {
  const apiUrl = useApiUrl();
  const support = shieldSupport(Platform.OS, apiUrl);
  const [on, setOn] = useState(false);
  const [access, setAccess] = useState(false);
  const [apps, setApps] = useState<MessageGuardApp[]>([]);
  const [error, setError] = useState<string | null>(null);
  const awaitingAccess = useRef(false);

  const refresh = useCallback(async () => {
    if (support !== 'ready') return;
    const [enabled, granted, list] = await Promise.all([
      ShieldModule.isMessageGuardEnabled(),
      ShieldModule.hasNotificationAccess(),
      ShieldModule.getMessageGuardApps(),
    ]);
    setOn(enabled);
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
      if (await ShieldModule.hasNotificationAccess()) await turnOn().catch(() => undefined);
      else setError(t('shield:messageGuard.errors.accessOff'));
    });
    return () => sub.remove();
  }, [refresh, support, turnOn]);

  const setEnabled = useCallback(
    async (next: boolean) => {
      if (support !== 'ready') return;
      setError(null);
      if (!next) {
        awaitingAccess.current = false;
        await ShieldModule.setMessageGuardEnabled(false);
        await refresh();
        return;
      }
      if (!(await ShieldModule.hasNotificationAccess())) {
        awaitingAccess.current = true;
        if (!(await ShieldModule.openNotificationAccessSettings())) {
          awaitingAccess.current = false;
          setError(t('shield:messageGuard.errors.cannotOpen'));
        }
        return;
      }
      await turnOn();
    },
    [refresh, support, turnOn],
  );

  const toggleApp = useCallback(
    async (id: string) => {
      const next = apps.map(a => (a.id === id ? { ...a, enabled: !a.enabled } : a));
      setApps(next);
      await ShieldModule.setMessageGuardApps(next.filter(a => a.enabled).map(a => a.id));
    },
    [apps],
  );

  return { support, enabled: on && access, access, apps, error, setEnabled, toggleApp };
}
