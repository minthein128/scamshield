import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import * as ShieldModule from 'shield-module';
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
  shield.isShieldRunning.mockResolvedValue(false);
  shield.startShield.mockResolvedValue(true);
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
    shield.isShieldRunning.mockResolvedValue(true);
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
