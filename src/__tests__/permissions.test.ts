import { PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EXPLAINED_KEY, ensureContacts, ensureMicrophone, ensureNotifications, explainOnce, explainOnceEver, registerPermissionHost, resetPermissionSession, type AndroidPermissionApi } from '../lib/permissions';

const { GRANTED, DENIED, NEVER_ASK_AGAIN } = PermissionsAndroid.RESULTS;

function api(over: Partial<AndroidPermissionApi> = {}): AndroidPermissionApi & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    platform: 'android',
    version: 34,
    check: jest.fn(async () => false),
    request: jest.fn(async () => {
      calls.push('request');
      return GRANTED;
    }),
    explain: jest.fn(async () => {
      calls.push('explain');
      return true;
    }),
    ...over,
  };
}

describe('just-in-time permissions', () => {
  it('explains before the system dialog', async () => {
    const a = api();
    expect(await ensureMicrophone(a)).toBe('granted');
    expect(a.calls).toEqual(['explain', 'request']);
  });

  it('does not prompt or explain when already granted', async () => {
    const a = api({ check: jest.fn(async () => true) });
    expect(await ensureMicrophone(a)).toBe('granted');
    expect(a.calls).toEqual([]);
  });

  it('skips the system dialog when the user declines the explanation', async () => {
    const a = api({ explain: jest.fn(async () => false) });
    expect(await ensureMicrophone(a)).toBe('declined');
    expect(a.request).not.toHaveBeenCalled();
  });

  it('reports a refusal and a permanent refusal', async () => {
    expect(await ensureMicrophone(api({ request: jest.fn(async () => DENIED) }))).toBe('denied');
    expect(await ensureMicrophone(api({ request: jest.fn(async () => NEVER_ASK_AGAIN) }))).toBe('blocked');
  });

  it('treats a throwing request as denied', async () => {
    expect(await ensureContacts(api({ request: jest.fn(async () => Promise.reject(new Error('x'))) }))).toBe('denied');
  });

  it('never asks for notifications below Android 13', async () => {
    const a = api({ version: 32 });
    expect(await ensureNotifications('notifications', a)).toBe('granted');
    expect(a.calls).toEqual([]);
  });

  it('asks for notifications on Android 13 and above, and a refusal does not throw', async () => {
    const a = api({ request: jest.fn(async () => DENIED) });
    expect(await ensureNotifications('guardNotifications', a)).toBe('denied');
    expect(a.explain).toHaveBeenCalledWith('guardNotifications');
  });

  it('on web only explains and leaves the browser prompt to the feature', async () => {
    const a = api({ platform: 'web' });
    expect(await ensureMicrophone(a)).toBe('granted');
    expect(a.request).not.toHaveBeenCalled();
  });

  it('explains screen capture once per launch', async () => {
    resetPermissionSession();
    const explain = jest.fn(async () => true);
    const off = registerPermissionHost({ explain, help: jest.fn() });
    expect(await explainOnce('screen')).toBe(true);
    expect(await explainOnce('screen')).toBe(true);
    expect(explain).toHaveBeenCalledTimes(1);
    off();
  });

  it('does not remember a declined explanation', async () => {
    resetPermissionSession();
    const explain = jest.fn(async () => false);
    const off = registerPermissionHost({ explain, help: jest.fn() });
    expect(await explainOnce('screen')).toBe(false);
    expect(await explainOnce('screen')).toBe(false);
    expect(explain).toHaveBeenCalledTimes(2);
    off();
  });
});

describe('explainOnceEver', () => {
  beforeEach(() => AsyncStorage.clear());

  it('shows the reason once per install, across launches, whatever the answer', async () => {
    const explain = jest.fn(async () => false);
    const off = registerPermissionHost({ explain, help: jest.fn() });
    expect(await explainOnceEver('notifications')).toBe(false);
    resetPermissionSession();
    expect(await explainOnceEver('notifications')).toBe(false);
    expect(explain).toHaveBeenCalledTimes(1);
    expect(JSON.parse((await AsyncStorage.getItem(EXPLAINED_KEY)) as string)).toEqual(['notifications']);
    off();
  });

  it('skips the system dialog after the reason was shown once', async () => {
    const a = api({ explain: explainOnceEver });
    const off = registerPermissionHost({ explain: jest.fn(async () => true), help: jest.fn() });
    expect(await ensureNotifications('notifications', a)).toBe('granted');
    expect(await ensureNotifications('notifications', a)).toBe('declined');
    expect(a.request).toHaveBeenCalledTimes(1);
    off();
  });
});
