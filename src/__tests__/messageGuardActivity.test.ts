import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as ShieldModule from 'shield-module';
import type { MessageGuardEvent, MessageGuardStatus } from 'shield-module';
import { diag, readLog, resetDiagMemory, sanitizeValue } from '../lib/diagLog';
import {
  ACTIVITY_CURSOR_KEY,
  describeOutcome,
  lastActivityLine,
  levelFor,
  problemsFor,
  resetMessageGuardActivityMemory,
  syncMessageGuardActivity,
} from '../lib/messageGuardActivity';

jest.mock('shield-module', () => ({
  getMessageGuardActivity: jest.fn(),
}));

const getActivity = ShieldModule.getMessageGuardActivity as jest.MockedFunction<typeof ShieldModule.getMessageGuardActivity>;

const on: MessageGuardStatus = {
  enabled: true,
  consent: true,
  pausedReason: null,
  listenerConnected: true,
  notificationsEnabled: true,
  batteryOptimized: false,
  missingApps: [],
  last: null,
};

function event(seq: number, outcome: string, at = Date.now() - 60_000): MessageGuardEvent {
  return { seq, at, app: 'viber', label: 'Viber', outcome };
}

const realOS = Platform.OS;
beforeAll(() => {
  Platform.OS = 'android';
});
afterAll(() => {
  Platform.OS = realOS;
});

beforeEach(async () => {
  await AsyncStorage.clear();
  resetDiagMemory();
  resetMessageGuardActivityMemory();
  getActivity.mockReset();
});

describe('outcome codes in the diagnostics log', () => {
  it('keeps every outcome code through the sanitizer', () => {
    for (const code of [
      'skipped_too_short',
      'skipped_hidden_preview',
      'skipped_rate_limited',
      'skipped_not_risky',
      'check_failed:no_connection',
      'check_failed:server_503',
      'result:careful:notice_blocked',
    ]) {
      expect(sanitizeValue(code)).toBe(code);
    }
  });

  it('still redacts long tokens', () => {
    expect(sanitizeValue('abcdefghijklmnopqrstuvwxyz')).toBe('[redacted]');
    expect(sanitizeValue('ab_c3d4e5f6a7b8c9d0e1f2')).toBe('[redacted]');
  });

  it('warns on failures, limits and hidden previews', () => {
    expect(levelFor('check_failed:timeout')).toBe('warn');
    expect(levelFor('result:danger:notice_blocked')).toBe('warn');
    expect(levelFor('skipped_hidden_preview')).toBe('warn');
    expect(levelFor('skipped_not_risky')).toBe('info');
    expect(levelFor('result:safe')).toBe('info');
  });
});

describe('syncMessageGuardActivity', () => {
  it('copies new native events once, at their own time, with the app id only', async () => {
    const at = Date.now() - 5 * 60_000;
    diag.info('app', 'later');
    getActivity.mockResolvedValueOnce({ events: [event(0, 'skipped_not_risky', at), event(1, 'check_failed:timeout', at + 1)], counts: {} });
    await syncMessageGuardActivity();
    expect(getActivity).toHaveBeenCalledWith(-1);
    expect(await AsyncStorage.getItem(ACTIVITY_CURSOR_KEY)).toBe('1');

    getActivity.mockResolvedValueOnce({ events: [], counts: {} });
    await syncMessageGuardActivity();
    expect(getActivity).toHaveBeenLastCalledWith(1);

    const log = await readLog();
    const guard = log.filter(e => e.area === 'messageGuard');
    expect(guard.map(e => e.event)).toEqual(['skipped_not_risky', 'check_failed:timeout']);
    expect(guard[0].t).toBe(at);
    expect(guard[0].d).toEqual({ app: 'viber' });
    expect(guard[1].level).toBe('warn');
    expect(log[log.length - 1].event).toBe('later');
  });

  it('logs the problem list when it changes', async () => {
    getActivity.mockResolvedValue({ events: [], counts: {} });
    await syncMessageGuardActivity({ ...on, batteryOptimized: true, listenerConnected: false }, true);
    await syncMessageGuardActivity({ ...on, batteryOptimized: true, listenerConnected: false }, true);
    await syncMessageGuardActivity(on, true);
    const health = (await readLog()).filter(e => e.event.startsWith('health'));
    expect(health.map(e => e.event)).toEqual(['health', 'health_ok']);
    expect(health[0].d).toEqual({ notConnected: true, battery: true });
  });
});

describe('problemsFor', () => {
  it('lists nothing while Message Guard is off', () => {
    expect(problemsFor({ ...on, enabled: false, batteryOptimized: true }, false)).toEqual([]);
  });

  it('puts missing access first and alone', () => {
    expect(problemsFor({ ...on, batteryOptimized: true }, false)).toEqual(['accessOff']);
  });

  it('lists each problem once', () => {
    expect(
      problemsFor({ ...on, listenerConnected: false, notificationsEnabled: false, missingApps: ['Viber'], batteryOptimized: true }, true),
    ).toEqual(['notConnected', 'notificationsOff', 'missingApps', 'battery']);
  });

  it('checks a paused Message Guard too', () => {
    expect(problemsFor({ ...on, enabled: false, pausedReason: 'daily_limit', batteryOptimized: true }, true)).toEqual(['battery']);
  });

  it('ignores fields an older native build does not send', () => {
    expect(problemsFor({ enabled: true, consent: true, pausedReason: null }, true)).toEqual([]);
  });
});

describe('last activity line', () => {
  it('says it is waiting before the first message', () => {
    expect(lastActivityLine(null)).toBe('Waiting for messages from the apps you chose.');
  });

  it('names the app and the outcome in plain words', () => {
    const now = new Date();
    expect(lastActivityLine(event(3, 'skipped_not_risky', now.getTime() - 5 * 60_000), now)).toBe(
      'Last message from Viber, 5 min ago: looked normal, not sent',
    );
    expect(describeOutcome('skipped_otp')).toBe('a one-time code, kept on your phone');
    expect(describeOutcome('check_failed:server_503')).toBe('the check did not finish. Check your internet connection.');
    expect(describeOutcome('result:danger')).toBe('checked, Kakwe posted a notice');
    expect(describeOutcome('result:careful:notice_blocked')).toContain('notifications are off');
  });
});
