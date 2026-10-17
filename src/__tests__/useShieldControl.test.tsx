import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import * as ShieldModule from 'shield-module';
import i18n from '../i18n';
import { BigShieldButton, BUSY_DELAY_MS } from '../components/BigShieldButton';
import { SETTLE_INTERVAL_MS, SETTLE_TIMEOUT_MS } from '../lib/shieldState';
import { ShieldCard } from '../components/ShieldCard';
import { resetShieldPermissionCache, useShieldControl } from '../hooks/useShieldControl';
import { registerPermissionHost, type PermissionKind } from '../lib/permissions';

jest.mock('shield-module', () => ({
  COMPANION_STRING_KEYS: [],
  hasOverlayPermission: jest.fn(),
  requestOverlayPermission: jest.fn(),
  isShieldRunning: jest.fn(),
  startShield: jest.fn(),
  stopShield: jest.fn(),
  setShieldAuthToken: jest.fn(),
  checkScreenNow: jest.fn(),
  addShieldStateListener: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => require('react').useEffect(cb, [cb]),
}));
jest.mock('../state/AppState', () => ({
  useAppState: () => ({ language: 'en', profile: { homeCountry: 'MM', destinationCountry: 'TH', shareSignals: false } }),
}));
jest.mock('../config/runtime', () => ({ useApiUrl: () => 'https://api.example.com' }));
let mockToken: () => Promise<string | null> = async () => null;
jest.mock('../services/token', () => ({ getAuthToken: () => mockToken() }));

const shield = ShieldModule as jest.Mocked<typeof ShieldModule>;
const realOS = Platform.OS;
const realVersion = Platform.Version;
let appStateListener: ((s: string) => void) | null = null;
let explain: jest.Mock<Promise<boolean>, [PermissionKind]>;
let help: jest.Mock;
let off: () => void;

const SERVICE_DELAY_MS = 250;
let nativeRunning = false;
let emitEvents = true;
const stateListeners = new Set<(running: boolean) => void>();

function serviceChanges(running: boolean) {
  nativeRunning = running;
  if (emitEvents) stateListeners.forEach(l => l(running));
}

beforeAll(() => {
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  Object.defineProperty(Platform, 'Version', { value: 34, configurable: true });
});
afterAll(() => {
  Object.defineProperty(Platform, 'OS', { value: realOS, configurable: true });
  Object.defineProperty(Platform, 'Version', { value: realVersion, configurable: true });
});

beforeEach(async () => {
  await AsyncStorage.clear();
  resetShieldPermissionCache();
  jest.clearAllMocks();
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, l: (s: string) => void) => {
    appStateListener = l;
    return { remove: jest.fn() };
  }) as never);
  jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
  jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
  shield.hasOverlayPermission.mockResolvedValue(true);
  shield.requestOverlayPermission.mockResolvedValue(true);
  nativeRunning = false;
  emitEvents = true;
  shield.isShieldRunning.mockImplementation(async () => nativeRunning);
  shield.startShield.mockImplementation(async () => {
    setTimeout(() => serviceChanges(true), SERVICE_DELAY_MS);
    return true;
  });
  shield.stopShield.mockImplementation(async () => {
    setTimeout(() => serviceChanges(false), SERVICE_DELAY_MS);
    return true;
  });
  shield.addShieldStateListener.mockImplementation(l => {
    stateListeners.add(l);
    return { remove: () => stateListeners.delete(l) };
  });
  mockToken = async () => null;
  explain = jest.fn(async (_kind: PermissionKind) => true);
  help = jest.fn();
  off = registerPermissionHost({ explain, help });
});

afterEach(() => off());

async function mount() {
  const view = renderHook(() => useShieldControl());
  await act(async () => undefined);
  return view;
}

describe('useShieldControl', () => {
  it('returns to idle and shows the overlay help when the overlay settings screen cannot open', async () => {
    shield.hasOverlayPermission.mockResolvedValue(false);
    shield.requestOverlayPermission.mockResolvedValue(false);
    const { result } = await mount();
    await act(async () => {
      await result.current.setEnabled(true);
    });
    expect(result.current.step).toBe('idle');
    expect(help).toHaveBeenCalledWith('overlay');
    expect(shield.startShield).not.toHaveBeenCalled();
  });

  it('waits on the overlay step while the settings screen is open', async () => {
    shield.hasOverlayPermission.mockResolvedValue(false);
    const { result } = await mount();
    await act(async () => {
      await result.current.setEnabled(true);
    });
    expect(result.current.step).toBe('overlay');
    expect(help).not.toHaveBeenCalled();
  });

  it('clears a stale start error once the shield is running', async () => {
    shield.startShield.mockResolvedValue(false);
    const { result } = await mount();
    await act(async () => {
      await result.current.setEnabled(true);
    });
    expect(shield.startShield).toHaveBeenCalledTimes(1);
    expect(result.current.error).not.toBeNull();
    nativeRunning = true;
    await act(async () => {
      appStateListener?.('active');
    });
    expect(result.current.running).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('shows the notifications reason once, not on every turn-on', async () => {
    explain.mockImplementation(async kind => kind !== 'notifications');
    const { result } = await mount();
    await act(async () => {
      await result.current.setEnabled(true);
    });
    await act(async () => {
      await result.current.setEnabled(true);
    });
    await act(async () => {
      await result.current.setEnabled(true);
    });
    expect(explain.mock.calls.filter(([k]) => k === 'notifications')).toHaveLength(1);
    expect(PermissionsAndroid.request).not.toHaveBeenCalled();
    expect(shield.startShield).toHaveBeenCalledTimes(3);
  });
});

describe.each([
  ['the service event', true],
  ['re-reading the service', false],
])('one tap settles on the confirmed state through %s', (_label, events) => {
  beforeEach(() => {
    emitEvents = events;
  });

  it('off to on: shows starting, then on, with no second tap', async () => {
    const { result } = await mount();
    let tap: Promise<void> = Promise.resolve();
    await act(async () => {
      tap = result.current.setEnabled(true);
      await new Promise(r => setTimeout(r, 50));
    });
    expect(result.current.step).toBe('starting');
    expect(result.current.running).toBe(false);
    expect(result.current.on).toBe(true);
    await act(() => tap);
    expect(result.current.running).toBe(true);
    expect(result.current.step).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(shield.startShield).toHaveBeenCalledTimes(1);
  });

  it('on to off: shows stopping, then off, with no second tap', async () => {
    nativeRunning = true;
    const { result } = await mount();
    expect(result.current.running).toBe(true);
    let tap: Promise<void> = Promise.resolve();
    await act(async () => {
      tap = result.current.setEnabled(false);
      await new Promise(r => setTimeout(r, 50));
    });
    expect(result.current.step).toBe('stopping');
    expect(result.current.running).toBe(true);
    expect(result.current.on).toBe(false);
    await act(() => tap);
    expect(result.current.running).toBe(false);
    expect(result.current.step).toBe('idle');
    expect(shield.stopShield).toHaveBeenCalledTimes(1);
  });
});

describe('shield state outside the tap', () => {
  it('shows off when the service never starts, instead of staying lit or busy', async () => {
    shield.startShield.mockResolvedValue(true);
    const { result } = await mount();
    await act(() => result.current.setEnabled(true));
    expect(result.current.running).toBe(false);
    expect(result.current.step).toBe('idle');
    expect(result.current.error).not.toBeNull();
  }, 20000);

  it('follows a stop from the bubble close target through the service event', async () => {
    nativeRunning = true;
    const { result } = await mount();
    expect(result.current.running).toBe(true);
    act(() => serviceChanges(false));
    expect(result.current.running).toBe(false);
  });

  it('reads the state again when the app comes back to the front', async () => {
    nativeRunning = true;
    emitEvents = false;
    const { result } = await mount();
    serviceChanges(false);
    expect(result.current.running).toBe(true);
    await act(async () => {
      appStateListener?.('active');
    });
    expect(result.current.running).toBe(false);
  });
});

describe('home and the shield screen', () => {
  type Node = { props: { children?: unknown } };
  const flat = (children: unknown): string =>
    Array.isArray(children) ? children.map(flat).join('') : typeof children === 'string' ? children : children && typeof children === 'object' && 'props' in children ? flat((children as Node).props.children) : '';
  const homeStatus = () => flat(screen.getAllByTestId('shield-status')[0]);
  const settled = () => {
    expect(screen.queryByTestId('shield-busy')).toBeNull();
    expect(screen.getByTestId('shield-button').props.accessibilityState.disabled).toBe(false);
  };

  async function until(check: () => void) {
    for (let waited = 0; ; waited += 50) {
      try {
        check();
        return;
      } catch (e) {
        if (waited > 8000) throw e;
      }
      await act(() => new Promise(r => setTimeout(r, 50)));
    }
  }

  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('home button: one tap turns on, one tap turns off', async () => {
    render(<BigShieldButton />);
    await act(async () => undefined);
    expect(homeStatus()).toBe('Shield is OFF');
    fireEvent.press(screen.getByTestId('shield-button'));
    expect(homeStatus()).toBe('Shield is ON');
    await until(settled);
    expect(nativeRunning).toBe(true);
    expect(homeStatus()).toBe('Shield is ON');
    fireEvent.press(screen.getByTestId('shield-button'));
    expect(homeStatus()).toBe('Shield is OFF');
    await until(settled);
    expect(nativeRunning).toBe(false);
    expect(homeStatus()).toBe('Shield is OFF');
    expect(shield.startShield).toHaveBeenCalledTimes(1);
    expect(shield.stopShield).toHaveBeenCalledTimes(1);
  }, 20000);

  it('a toggle on the shield screen updates home', async () => {
    render(
      <>
        <BigShieldButton />
        <ShieldCard />
      </>,
    );
    await act(async () => undefined);
    fireEvent(screen.getByTestId('shield-switch'), 'valueChange', true);
    expect(homeStatus()).toBe('Shield is ON');
    await until(settled);
    await until(() => expect(screen.getByTestId('shield-switch').props.accessibilityState.disabled).toBe(false));
    expect(nativeRunning).toBe(true);
    expect(flat(screen.getAllByTestId('shield-status')[1])).toBe(i18n.t('shield:status.on'));
  }, 20000);
});

describe('the circle reacts at once', () => {
  type Node = { props: { children?: unknown } };
  const flat = (children: unknown): string =>
    Array.isArray(children) ? children.map(flat).join('') : typeof children === 'string' ? children : children && typeof children === 'object' && 'props' in children ? flat((children as Node).props.children) : '';
  const status = () => flat(screen.getByTestId('shield-status'));
  const button = () => screen.getByTestId('shield-button');
  const spinner = () => screen.queryByTestId('shield-busy');
  const tick = () => act(() => jest.advanceTimersByTimeAsync(0));
  const advance = (ms: number) => act(() => jest.advanceTimersByTimeAsync(ms));
  const SLOW_MS = 1000;

  beforeEach(async () => {
    await i18n.changeLanguage('en');
    jest.useFakeTimers();
    const slow = (running: boolean) => async () => {
      setTimeout(() => serviceChanges(running), SLOW_MS);
      return true;
    };
    shield.startShield.mockImplementation(slow(true));
    shield.stopShield.mockImplementation(slow(false));
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
  });
  afterEach(async () => {
    await act(() => jest.runAllTimersAsync());
    jest.useRealTimers();
  });

  async function show() {
    render(<BigShieldButton />);
    await tick();
  }

  it('on: the look flips on the tap and the spinner waits 300 ms for a slow service', async () => {
    await show();
    expect(status()).toBe('Shield is OFF');
    fireEvent.press(button());
    expect(status()).toBe('Shield is ON');
    expect(screen.getByText('On')).toBeTruthy();
    expect(spinner()).toBeNull();
    await advance(BUSY_DELAY_MS - 1);
    expect(spinner()).toBeNull();
    await advance(1);
    expect(spinner()).not.toBeNull();
    expect(shield.startShield).toHaveBeenCalledTimes(1);
    await advance(SLOW_MS);
    await tick();
    expect(spinner()).toBeNull();
    expect(status()).toBe('Shield is ON');
    expect(button().props.accessibilityState.disabled).toBe(false);
  });

  it('off: the look flips on the tap, and a quick stop never shows the spinner', async () => {
    nativeRunning = true;
    shield.stopShield.mockImplementation(async () => {
      serviceChanges(false);
      return true;
    });
    await show();
    expect(status()).toBe('Shield is ON');
    const reads = shield.isShieldRunning.mock.calls.length;
    fireEvent.press(button());
    expect(status()).toBe('Shield is OFF');
    expect(screen.getByText('Turn on')).toBeTruthy();
    await tick();
    expect(spinner()).toBeNull();
    expect(button().props.accessibilityState.disabled).toBe(false);
    expect(shield.isShieldRunning.mock.calls.length).toBe(reads);
    expect(status()).toBe('Shield is OFF');
  });

  it('settles on the service event without waiting for the next status read', async () => {
    await show();
    fireEvent.press(button());
    await advance(SLOW_MS - 1);
    expect(button().props.accessibilityState.disabled).toBe(true);
    const reads = shield.isShieldRunning.mock.calls.length;
    await advance(1);
    expect(button().props.accessibilityState.disabled).toBe(false);
    expect(shield.isShieldRunning.mock.calls.length).toBe(reads);
  });

  it('a returning user starts with no permission checks and no awaits before startShield', async () => {
    await show();
    fireEvent.press(button());
    await advance(SLOW_MS);
    expect(nativeRunning).toBe(true);
    fireEvent.press(button());
    await advance(SLOW_MS);
    expect(nativeRunning).toBe(false);
    expect(status()).toBe('Shield is OFF');
    jest.clearAllMocks();
    fireEvent.press(button());
    expect(shield.startShield).toHaveBeenCalledTimes(1);
    expect(shield.hasOverlayPermission).not.toHaveBeenCalled();
    expect(PermissionsAndroid.check).not.toHaveBeenCalled();
    expect(explain).not.toHaveBeenCalled();
  });

  it('starts without waiting for the sign-in token and sends it when it arrives', async () => {
    let giveToken: (t: string) => void = () => undefined;
    mockToken = () => new Promise(resolve => (giveToken = resolve));
    await show();
    fireEvent.press(button());
    await tick();
    expect(shield.startShield).toHaveBeenCalledTimes(1);
    expect(shield.startShield.mock.calls[0][0]).not.toHaveProperty('authToken');
    await advance(SLOW_MS);
    await tick();
    await act(async () => giveToken('id-token'));
    expect(shield.setShieldAuthToken).toHaveBeenCalledWith('id-token');
  });

  it('rolls back to off with the error text when the start fails', async () => {
    shield.startShield.mockResolvedValue(false);
    await show();
    fireEvent.press(button());
    expect(status()).toBe('Shield is ON');
    await tick();
    await tick();
    expect(status()).toBe('Shield is OFF');
    expect(flat(screen.getByTestId('shield-error'))).toBe(i18n.t('shield:errors.notStarted'));
    expect(button().props.accessibilityState.disabled).toBe(false);
  });

  it('rolls back to off when the service never confirms', async () => {
    emitEvents = false;
    shield.startShield.mockResolvedValue(true);
    await show();
    fireEvent.press(button());
    expect(status()).toBe('Shield is ON');
    for (let i = 0; i <= SETTLE_TIMEOUT_MS / SETTLE_INTERVAL_MS + 1; i++) await advance(SETTLE_INTERVAL_MS);
    expect(status()).toBe('Shield is OFF');
    expect(screen.getByTestId('shield-error')).toBeTruthy();
  });

  it('first run: Settings opens for the overlay, then the start continues by itself when the user comes back', async () => {
    let granted = false;
    shield.hasOverlayPermission.mockImplementation(async () => granted);
    shield.requestOverlayPermission.mockResolvedValue(true);
    await show();
    fireEvent.press(button());
    await tick();
    await tick();
    expect(shield.startShield).not.toHaveBeenCalled();
    expect(status()).toBe('Shield is OFF');
    expect(flat(screen.getByTestId('shield-hint'))).toBe(i18n.t('shield:steps.overlay'));
    expect(help).not.toHaveBeenCalled();
    granted = true;
    await act(async () => appStateListener?.('active'));
    await tick();
    expect(shield.startShield).toHaveBeenCalledTimes(1);
    expect(status()).toBe('Shield is ON');
    await advance(SLOW_MS);
    await tick();
    expect(nativeRunning).toBe(true);
    expect(button().props.accessibilityState.disabled).toBe(false);
  });

  it.each([31, 33, 34, 35])('Android API %i turns the shield on without asking for screen capture', async version => {
    Object.defineProperty(Platform, 'Version', { value: version, configurable: true });
    try {
      await show();
      fireEvent.press(button());
      await tick();
      expect(shield.startShield).toHaveBeenCalledTimes(1);
      expect(explain.mock.calls.map(([k]) => k as string)).not.toContain('screen');
      await advance(SLOW_MS);
      await tick();
      expect(status()).toBe('Shield is ON');
    } finally {
      Object.defineProperty(Platform, 'Version', { value: 34, configurable: true });
    }
  });
});
