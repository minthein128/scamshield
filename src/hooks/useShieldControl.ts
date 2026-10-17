import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AppState, Platform } from 'react-native';
import * as ShieldModule from 'shield-module';
import { t } from '../i18n';
import { useApiUrl } from '../config/runtime';
import { companionStrings } from '../lib/companionStrings';
import { diag, errorCode } from '../lib/diagLog';
import { ensureNotifications, explainOnce, explainOnceEver, explainPermission, permissionApi, showPermissionHelp } from '../lib/permissions';
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
  if (step === 'idle') return '';
  return t(`shield:steps.${step}`);
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
  const { language, profile } = useAppState();
  const { homeCountry, destinationCountry } = profile;
  const shareSignals = profile.shareSignals === true;
  const apiUrl = useApiUrl();
  const support = shieldSupport(Platform.OS, apiUrl);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState<ShieldStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const awaitingOverlay = useRef(false);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (support !== 'ready') return;
    const on = await ShieldModule.isShieldRunning();
    setRunning(on);
    if (on) setError(null);
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
        if (!(await explainPermission('overlay'))) {
          diag.info('shield', 'overlay_declined');
          return;
        }
        diag.info('shield', 'overlay_permission_requested');
        setStep('overlay');
        awaitingOverlay.current = true;
        if (await ShieldModule.requestOverlayPermission()) return;
        awaitingOverlay.current = false;
        if (!(await ShieldModule.hasOverlayPermission())) {
          diag.warn('shield', 'overlay_settings_unavailable');
          setStep('idle');
          showPermissionHelp('overlay');
          return;
        }
      }
      awaitingOverlay.current = false;
      setStep('notifications');
      const notified = await ensureNotifications(permissionApi({ explain: explainOnceEver }));
      if (notified !== 'granted') diag.info('shield', 'notifications_not_granted', { result: notified });
      setStep('capture');
      if (!(await explainOnce('screen'))) {
        diag.info('shield', 'capture_declined');
        setStep('idle');
        return;
      }
      if (!(await ShieldModule.requestScreenCapturePermission())) {
        diag.warn('shield', 'capture_denied');
        setError(t('shield:errors.needsScreen'));
        showPermissionHelp('screen');
        setStep('idle');
        return;
      }
      setStep('starting');
      const token = await getAuthToken();
      const ok = await ShieldModule.startShield({
        apiUrl: apiUrl ?? '',
        language,
        strings: companionStrings(),
        shareSignals,
        ...(homeCountry ? { home: homeCountry } : {}),
        ...(destinationCountry ? { destination: destinationCountry } : {}),
        ...(token ? { authToken: token } : {}),
      });
      diag[ok ? 'info' : 'warn']('shield', ok ? 'started' : 'not_started', { hasUrl: Boolean(apiUrl), hasToken: Boolean(token) });
      if (!ok) setError(t('shield:errors.notStarted'));
      setStep('idle');
      await refresh();
    } catch (e) {
      diag.error('shield', 'start_failed', { code: errorCode(e) });
      setError(t('shield:errors.failed'));
      setStep('idle');
    } finally {
      busy.current = false;
    }
  }, [language, refresh, apiUrl, homeCountry, destinationCountry, shareSignals]);

  useEffect(() => {
    refresh().catch(() => undefined);
    if (support !== 'ready') return;
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      refresh().catch(() => undefined);
      if (awaitingOverlay.current) {
        ShieldModule.hasOverlayPermission().then(ok => {
          if (ok) turnOn().catch(() => undefined);
          else {
            setStep('idle');
            showPermissionHelp('overlay');
          }
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
      diag.info('shield', 'check_now');
      return true;
    } catch (e) {
      diag.error('shield', 'check_now_failed', { code: errorCode(e) });
      setError(t('shield:errors.checkFailed'));
      return false;
    }
  }, []);

  return { support, running, step, error, setEnabled, checkNow };
}
