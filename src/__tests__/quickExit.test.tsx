import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { BackHandler, Platform } from 'react-native';
import { exitAfterQuickExit, NEUTRAL_SITE, resetQuickExitForTests, revealRecent, useRecentHidden } from '../lib/quickExit';

const setOS = (os: string) => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });

beforeEach(async () => {
  await AsyncStorage.clear();
  resetQuickExitForTests();
  jest.restoreAllMocks();
});

afterAll(() => setOS('ios'));

describe('quick exit', () => {
  it('hides recent checks until revealed and keeps that across a restart', async () => {
    setOS('ios');
    const first = renderHook(() => useRecentHidden());
    expect(first.result.current[0]).toBe(false);
    await act(async () => {
      await exitAfterQuickExit();
    });
    expect(first.result.current[0]).toBe(true);
    first.unmount();

    resetQuickExitForTests();
    const restarted = renderHook(() => useRecentHidden());
    await act(async () => undefined);
    expect(restarted.result.current[0]).toBe(true);

    act(() => revealRecent());
    expect(restarted.result.current[0]).toBe(false);
    restarted.unmount();

    resetQuickExitForTests();
    const again = renderHook(() => useRecentHidden());
    await act(async () => undefined);
    expect(again.result.current[0]).toBe(false);
  });

  it('leaves the app on Android', async () => {
    setOS('android');
    const exit = jest.spyOn(BackHandler, 'exitApp').mockImplementation(() => undefined);
    await exitAfterQuickExit();
    expect(exit).toHaveBeenCalledTimes(1);
  });

  it('replaces the page with a neutral site on web', async () => {
    setOS('web');
    const replace = jest.fn();
    const original = (globalThis as { window?: unknown }).window;
    (globalThis as { window?: unknown }).window = { location: { replace } };
    try {
      await exitAfterQuickExit();
    } finally {
      (globalThis as { window?: unknown }).window = original;
    }
    expect(replace).toHaveBeenCalledWith(NEUTRAL_SITE);
    expect(NEUTRAL_SITE).toBe('https://www.google.com');
  });

  it('does not exit the app on iOS', async () => {
    setOS('ios');
    const exit = jest.spyOn(BackHandler, 'exitApp').mockImplementation(() => undefined);
    await exitAfterQuickExit();
    expect(exit).not.toHaveBeenCalled();
  });
});
