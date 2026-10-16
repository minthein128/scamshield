import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as ShieldModule from 'shield-module';
import type { MessageGuardEvent, MessageGuardStatus } from 'shield-module';
import { t } from '../i18n';
import { diag, type DiagLevel } from './diagLog';
import { formatRelative } from './time';

export const ACTIVITY_CURSOR_KEY = 'saferoute.messageGuard.activitySeq';

/** One plain-language problem that can stop Message Guard from working. */
export type MessageGuardProblem = 'accessOff' | 'notConnected' | 'notificationsOff' | 'missingApps' | 'battery';

const WARN_PREFIXES = ['check_failed', 'skipped_paused', 'skipped_rate_limited', 'skipped_hidden_preview'];

export function levelFor(outcome: string): DiagLevel {
  if (outcome.endsWith(':notice_blocked')) return 'warn';
  return WARN_PREFIXES.some(p => outcome.startsWith(p)) ? 'warn' : 'info';
}

/** Problems for a Message Guard the user turned on. Nothing is listed while it is off. */
export function problemsFor(status: MessageGuardStatus, access: boolean): MessageGuardProblem[] {
  const on = status.enabled || Boolean(status.pausedReason && status.consent);
  if (!on) return [];
  if (!access) return ['accessOff'];
  const out: MessageGuardProblem[] = [];
  if (status.listenerConnected === false) out.push('notConnected');
  if (status.notificationsEnabled === false) out.push('notificationsOff');
  if (status.missingApps && status.missingApps.length > 0) out.push('missingApps');
  if (status.batteryOptimized === true) out.push('battery');
  return out;
}

const OUTCOME_KEYS: Record<string, string> = {
  skipped_paused: 'paused',
  skipped_self: 'self',
  skipped_no_text: 'noText',
  skipped_hidden_preview: 'hiddenPreview',
  skipped_too_short: 'tooShort',
  skipped_otp: 'otp',
  skipped_not_risky: 'notRisky',
  skipped_duplicate: 'duplicate',
  skipped_rate_limited: 'rateLimited',
  sent: 'sent',
  'result:safe': 'resultSafe',
  'result:careful': 'resultWarned',
  'result:danger': 'resultWarned',
};

/** Plain words for one outcome code, in the UI language. */
export function describeOutcome(outcome: string): string {
  if (outcome.startsWith('check_failed')) return t('shield:messageGuard.activity.outcome.checkFailed');
  if (outcome.endsWith(':notice_blocked')) return t('shield:messageGuard.activity.outcome.noticeBlocked');
  const key = OUTCOME_KEYS[outcome];
  return key ? t(`shield:messageGuard.activity.outcome.${key}` as 'shield:messageGuard.activity.outcome.sent') : outcome;
}

/** "Last message from Viber, 5 min ago: looked normal, not sent", or the waiting line. */
export function lastActivityLine(last: MessageGuardEvent | null | undefined, now: Date = new Date()): string {
  if (!last) return t('shield:messageGuard.activity.waiting');
  return t('shield:messageGuard.activity.last', {
    app: last.label || last.app,
    time: formatRelative(new Date(last.at).toISOString(), now),
    outcome: describeOutcome(last.outcome),
  });
}

let running: Promise<void> | null = null;
let lastProblems = '';

async function syncOnce(): Promise<void> {
  const raw = await AsyncStorage.getItem(ACTIVITY_CURSOR_KEY).catch(() => null);
  const cursor = raw !== null && Number.isFinite(Number(raw)) ? Number(raw) : -1;
  const { events } = await ShieldModule.getMessageGuardActivity(cursor);
  let next = cursor;
  for (const e of events) {
    diag.at(e.at, levelFor(e.outcome), 'messageGuard', e.outcome, { app: e.app });
    next = Math.max(next, e.seq);
  }
  if (next !== cursor) await AsyncStorage.setItem(ACTIVITY_CURSOR_KEY, String(next)).catch(() => undefined);
}

/** Copies new native decisions into the Diagnostics log and notes changes in the problem list. */
export function syncMessageGuardActivity(status?: MessageGuardStatus, access?: boolean): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (status && access !== undefined) {
    const problems = problemsFor(status, access).join(',');
    if (problems !== lastProblems) {
      lastProblems = problems;
      if (problems) diag.warn('messageGuard', 'health', Object.fromEntries(problems.split(',').map(p => [p, true])));
      else diag.info('messageGuard', 'health_ok');
    }
  }
  if (running) return running;
  running = syncOnce()
    .catch(() => undefined)
    .finally(() => {
      running = null;
    });
  return running;
}

/** Test helper. */
export function resetMessageGuardActivityMemory(): void {
  running = null;
  lastProblems = '';
}
