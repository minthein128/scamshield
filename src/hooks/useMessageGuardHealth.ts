import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import * as ShieldModule from 'shield-module';
import type { MessageGuardEvent } from 'shield-module';
import { diag } from '../lib/diagLog';
import { problemsFor, syncMessageGuardActivity, type MessageGuardProblem } from '../lib/messageGuardActivity';
import type { ShieldSupport } from './useShieldControl';

export const HEALTH_POLL_MS = 15_000;

export interface MessageGuardHealth {
  /** Message Guard is on or paused, so problems and the last activity apply. */
  watching: boolean;
  problems: MessageGuardProblem[];
  missingApps: string[];
  last: MessageGuardEvent | null;
  openBatterySettings: () => Promise<void>;
}

/** Status checks and the newest decision for the Message Guard card. Codes only, no message content. */
export function useMessageGuardHealth(support: ShieldSupport, refreshKey: string = ''): MessageGuardHealth {
  const [watching, setWatching] = useState(false);
  const [problems, setProblems] = useState<MessageGuardProblem[]>([]);
  const [missingApps, setMissingApps] = useState<string[]>([]);
  const [last, setLast] = useState<MessageGuardEvent | null>(null);

  const refresh = useCallback(async () => {
    if (support !== 'ready') return;
    const [status, access] = await Promise.all([ShieldModule.getMessageGuardStatus(), ShieldModule.hasNotificationAccess()]);
    const list = problemsFor(status, access);
    setWatching(status.enabled || Boolean(status.pausedReason && status.consent));
    setProblems(list);
    setMissingApps(status.missingApps ?? []);
    setLast(status.last ?? null);
    await syncMessageGuardActivity(status, access);
  }, [support]);

  useEffect(() => {
    if (support !== 'ready') return;
    refresh().catch(() => undefined);
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refresh().catch(() => undefined);
    }, HEALTH_POLL_MS);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh().catch(() => undefined);
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh, support, refreshKey]);

  const openBatterySettings = useCallback(async () => {
    const opened = await ShieldModule.openBatteryOptimizationSettings();
    diag.info('messageGuard', 'battery_settings', { opened });
  }, []);

  return { watching, problems, missingApps, last, openBatterySettings };
}
