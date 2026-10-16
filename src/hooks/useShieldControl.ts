import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import * as ShieldModule from 'shield-module';
import { t } from '../i18n';
import { useApiUrl } from '../config/runtime';
import { isCleartext } from '../lib/shield';
import { getAuthToken } from '../services/token';
import { useAppState } from '../state/AppState';

export type ShieldSupport = 'ready' | 'web' | 'no-service' | 'insecure-service' | 'unsupported';

export function shieldSupport(platform: string = Platform.OS, apiUrl: string | null = ''): ShieldSupport {
  if (platform === 'web') return 'web';
  if (platform !== 'android') return 'unsupported';
  if (apiUrl === null) return 'ready';
  if (!apiUrl) return 'no-service';
  if (isCleartext(apiUrl)) return 'insecure-service';
  return 'ready';
}

export type ShieldStep = 'idle' | 'overlay' | 'notifications' | 'capture' | 'starting';

export function stepText(step: ShieldStep): string {
  return step === 'idle' ? '' : t(`shield:steps.${step}`);
}

export interface ShieldControl {
  support: ShieldSupport;
  running: boolean;
  step: ShieldStep;
  error: string | null;
  setEnabled: (on: boolean) => Promise<void>;
  checkNow: () => Promise<boolean>;
}

export function useShieldControl(): ShieldControl {
  const { language } = useAppState();
  const apiUrl = useApiUrl();
  const support = shieldSupport(Platform.OS, apiUrl);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<ShieldStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const awaitingOverlay = useRef(false);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (support !== 'ready') return;
    setRunning(await ShieldModule.isShieldRunning());
  }, [support]);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  const turnOn = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      if (!(await ShieldModule.hasOverlayPermission())) {
        setStep('overlay');
        awaitingOverlay.current = true;
        await ShieldModule.requestOverlayPermission();
        return;
      }
      awaitingOverlay.current = false;
      if (Number(Platform.Version) >= 33) {
        setStep('notifications');
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }
      setStep('capture');
      if (!(await ShieldModule.requestScreenCapturePermission())) {
        setError(t('shield:errors.needsScreen'));
        setStep('idle');
        return;
      }
      setStep('starting');
      const token = await getAuthToken();
      const ok = await ShieldModule.startShield({ apiUrl: apiUrl ?? '', language, ...(token ? { authToken: token } : {}) });
      if (!ok) setError(t('shield:errors.notStarted'));
      setStep('idle');
      await refresh();
    } catch {
      setError(t('shield:errors.failed'));
      setStep('idle');
    } finally {
      busy.current = false;
    }
  }, [language, refresh, apiUrl]);

  useEffect(() => {
    refresh().catch(() => undefined);
    if (support !== 'ready') return;
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      refresh().catch(() => undefined);
      if (awaitingOverlay.current) {
        ShieldModule.hasOverlayPermission().then(ok => {
          if (ok) turnOn().catch(() => undefined);
          else setStep('idle');
        });
        awaitingOverlay.current = false;
      }
    });
    return () => sub.remove();
  }, [refresh, support, turnOn]);

  const setEnabled = useCallback(
    async (on: boolean) => {
      if (support !== 'ready') return;
      if (on) {
        await turnOn();
        return;
      }
      await ShieldModule.stopShield();
      setError(null);
      await refresh();
    },
    [refresh, support, turnOn],
  );

  const checkNow = useCallback(async () => {
    try {
      await ShieldModule.checkScreenNow();
      return true;
    } catch {
      setError(t('shield:errors.checkFailed'));
      return false;
    }
  }, []);

  return { support, running, step, error, setEnabled, checkNow };
}
