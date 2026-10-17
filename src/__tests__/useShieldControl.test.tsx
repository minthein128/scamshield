import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import * as ShieldModule from 'shield-module';
import i18n from '../i18n';
import { BigShieldButton } from '../components/BigShieldButton';
import { ShieldCard } from '../components/ShieldCard';
import { useShieldControl } from '../hooks/useShieldControl';
import { registerPermissionHost, resetPermissionSession, type PermissionKind } from '../lib/permissions';

jest.mock('shield-module', () => ({
  COMPANION_STRING_KEYS: [],
  hasOverlayPermission: jest.fn(),
  requestOverlayPermission: jest.fn(),
  requestScreenCapturePermission: jest.fn(),
  isShieldRunning: jest.fn(),
  startShield: jest.fn(),
  stopShield: jest.fn(),
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
jest.mock('../services/token', () => ({ getAuthToken: async () => null }));

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
  resetPermissionSession();
  jest.clearAllMocks();
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((_: string, l: (s: string) => void) => {
    appStateListener = l;
    return { remove: jest.fn() };
  }) as never);
  jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
  jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
  shield.hasOverlayPermission.mockResolvedValue(true);
  shield.requestOverlayPermission.mockResolvedValue(true);
  shield.requestScreenCapturePermission.mockResolvedValue(true);
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
    resetPermissionSession();
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
  const idle = () => expect(screen.queryByTestId('shield-busy') === null).toBe(true);

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
    await until(() => expect(homeStatus()).toBe('Shield is ON'));
    await until(idle);
    fireEvent.press(screen.getByTestId('shield-button'));
    await until(() => expect(homeStatus()).toBe('Shield is OFF'));
    await until(idle);
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
    await until(() => expect(homeStatus()).toBe('Shield is ON'));
    await until(idle);
    expect(flat(screen.getAllByTestId('shield-status')[1])).toBe(i18n.t('shield:status.on'));
  }, 20000);
});
