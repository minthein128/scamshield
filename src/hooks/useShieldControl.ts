import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import * as ShieldModule from 'shield-module';
import { API_URL } from '../config/env';
import { isCleartext } from '../lib/shield';
import { getAuthToken } from '../services/token';
import { useAppState } from '../state/AppState';

export type ShieldSupport = 'ready' | 'web' | 'no-service' | 'insecure-service' | 'unsupported';

export function shieldSupport(platform: string = Platform.OS, apiUrl: string = API_URL): ShieldSupport {
  if (platform === 'web') return 'web';
  if (platform !== 'android') return 'unsupported';
  if (!apiUrl) return 'no-service';
  if (isCleartext(apiUrl)) return 'insecure-service';
  return 'ready';
}

export type ShieldStep = 'idle' | 'overlay' | 'notifications' | 'capture' | 'starting';

export const STEP_TEXT: Record<ShieldStep, string> = {
  idle: '',
  overlay: 'Step 1 of 4: allow "Display over other apps", then come back to SafeRoute.',
  notifications: 'Step 2 of 4: allow notifications so Android keeps the shield running.',
  capture: 'Step 3 of 4: allow SafeRoute to see your screen when you tap the bubble.',
  starting: 'Step 4 of 4: starting the shield.',
};

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
  const support = shieldSupport();
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<ShieldStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const awaitingOverlay = useRef(false);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (support !== 'ready') return;
    setRunning(await ShieldModule.isShieldRunning());
  }, [support]);

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
        setError('The shield needs to see your screen to check it. Try again and tap Start now.');
        setStep('idle');
        return;
      }
      setStep('starting');
      const token = await getAuthToken();
      const ok = await ShieldModule.startShield({ apiUrl: API_URL, language, ...(token ? { authToken: token } : {}) });
      if (!ok) setError('The shield did not start. Check that "Display over other apps" is allowed and try again.');
      setStep('idle');
      await refresh();
    } catch {
      setError('The shield did not start. Try again.');
      setStep('idle');
    } finally {
      busy.current = false;
    }
  }, [language, refresh]);

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
      setError('The check did not start. Turn the shield on and try again.');
      return false;
    }
  }, []);

  return { support, running, step, error, setEnabled, checkNow };
}
