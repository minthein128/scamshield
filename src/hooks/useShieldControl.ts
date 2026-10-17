import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AppState, Platform } from 'react-native';
import * as ShieldModule from 'shield-module';
import { t } from '../i18n';
import { useApiUrl } from '../config/runtime';
import { companionStrings } from '../lib/companionStrings';
import { diag, errorCode } from '../lib/diagLog';
import { ensureNotifications, explainOnceEver, explainPermission, permissionApi, showPermissionHelp } from '../lib/permissions';
import { isCleartext } from '../lib/shield';
import {
  beginShieldTransition,
  cancelShieldTransition,
  confirmShieldTransition,
  getShieldState,
  refreshShieldState,
  runShieldTransition,
  shieldShownOn,
  subscribeShieldState,
} from '../lib/shieldState';
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

export type ShieldStep = 'idle' | 'overlay' | 'notifications' | 'starting' | 'stopping';

/** Steps that wait on the user (a reason dialog, a system dialog or Settings). */
export const PERMISSION_STEPS: readonly ShieldStep[] = ['overlay', 'notifications'];

export function stepText(step: ShieldStep): string {
  if (step === 'idle') return '';
  return t(`shield:steps.${step}`);
}

export interface ShieldControl {
  support: ShieldSupport;
  /** Confirmed by the service. */
  running: boolean;
  /** What the controls show: the target from the tap until the service confirms, then [running]. */
  on: boolean;
  step: ShieldStep;
  error: string | null;
  setEnabled: (on: boolean) => Promise<void>;
  checkNow: () => Promise<boolean>;
}

let overlayGranted = false;
let notificationsAsked = false;

/** Forgets the per-launch permission results that let a returning user start without checks. */
export function resetShieldPermissionCache(): void {
  overlayGranted = false;
  notificationsAsked = false;
}

export function useShieldControl(): ShieldControl {
  const { language, profile } = useAppState();
  const { homeCountry, destinationCountry } = profile;
  const shareSignals = profile.shareSignals === true;
  const apiUrl = useApiUrl();
  const support = shieldSupport(Platform.OS, apiUrl);
  const shared = useSyncExternalStore(subscribeShieldState, getShieldState);
  const running = shared.running;
  const on = shieldShownOn(shared);
  const [ownStep, setStep] = useState<ShieldStep>('idle');
  const step: ShieldStep = ownStep !== 'idle' ? ownStep : shared.transition ?? 'idle';
  const [error, setError] = useState<string | null>(null);
  const awaitingOverlay = useRef(false);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (support !== 'ready') return;
    await refreshShieldState();
  }, [support]);

  useEffect(() => {
    if (running) setError(null);
  }, [running]);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  const turnOn = useCallback(async () => {
    if (busy.current || !beginShieldTransition('starting')) return;
    busy.current = true;
    setError(null);
    let token: string | null | undefined;
    const tokenRead = getAuthToken().then(value => (token = value));
    let confirming = false;
    try {
      if (!overlayGranted && !(await ShieldModule.hasOverlayPermission())) {
        if (!(await explainPermission('overlay'))) {
          diag.info('shield', 'overlay_declined');
          return;
        }
        diag.info('shield', 'overlay_permission_requested');
        if (!(await ShieldModule.requestOverlayPermission())) {
          diag.warn('shield', 'overlay_settings_unavailable');
          setStep('idle');
          showPermissionHelp('overlay');
          return;
        }
        if (!(await ShieldModule.hasOverlayPermission())) {
          setStep('overlay');
          awaitingOverlay.current = true;
          return;
        }
      }
      overlayGranted = true;
      awaitingOverlay.current = false;
      if (!notificationsAsked) {
        setStep('notifications');
        const notified = await ensureNotifications(permissionApi({ explain: explainOnceEver }));
        notificationsAsked = true;
        if (notified !== 'granted') diag.info('shield', 'notifications_not_granted', { result: notified });
      }
      let ok = false;
      const sentToken = token;
      confirming = true;
      setStep('idle');
      const started = await confirmShieldTransition(async () => {
        ok = await ShieldModule.startShield({
          apiUrl: apiUrl ?? '',
          language,
          strings: companionStrings(),
          shareSignals,
          ...(homeCountry ? { home: homeCountry } : {}),
          ...(destinationCountry ? { destination: destinationCountry } : {}),
          ...(sentToken ? { authToken: sentToken } : {}),
        });
        if (!ok) overlayGranted = false;
        return ok;
      });
      if (started && sentToken === undefined) {
        tokenRead.then(value => (value ? ShieldModule.setShieldAuthToken(value) : undefined)).catch(() => undefined);
      }
      diag[started ? 'info' : 'warn']('shield', started ? 'started' : 'not_started', { hasUrl: Boolean(apiUrl), hasToken: Boolean(sentToken), accepted: ok });
      if (!started) setError(t('shield:errors.notStarted'));
    } catch (e) {
      diag.error('shield', 'start_failed', { code: errorCode(e) });
      setError(t('shield:errors.failed'));
      setStep('idle');
    } finally {
      if (!confirming) cancelShieldTransition();
      busy.current = false;
    }
  }, [language, apiUrl, homeCountry, destinationCountry, shareSignals]);

  useEffect(() => {
    refresh().catch(() => undefined);
    if (support !== 'ready') return;
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      refresh().catch(() => undefined);
      if (overlayGranted) ShieldModule.hasOverlayPermission().then(ok => (overlayGranted = ok)).catch(() => undefined);
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
    async (enable: boolean) => {
      if (support !== 'ready') return;
      if (enable) {
        await turnOn();
        return;
      }
      setError(null);
      const still = await runShieldTransition('stopping', () => ShieldModule.stopShield());
      if (still) diag.warn('shield', 'not_stopped');
    },
    [support, turnOn],
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

  return { support, running, on, step, error, setEnabled, checkNow };
}
