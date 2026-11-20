import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { BackHandler, Platform } from 'react-native';

const KEY = 'kakwe.recentHidden.v1';
export const NEUTRAL_SITE = 'https://www.google.com';

let hidden = false;
let loaded: Promise<void> | null = null;
const listeners = new Set<(v: boolean) => void>();

const set = (v: boolean) => {
  hidden = v;
  listeners.forEach(fn => fn(v));
};

const load = () =>
  (loaded ??= AsyncStorage.getItem(KEY)
    .then(raw => {
      if (raw === '1') set(true);
    })
    .catch(() => undefined));

/** True while Recent checks must stay hidden, from a Quick exit until the user reveals them. */
export function useRecentHidden(): [boolean, () => void] {
  const [value, setValue] = useState(hidden);
  useEffect(() => {
    listeners.add(setValue);
    setValue(hidden);
    load().then(() => setValue(hidden));
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return [value, revealRecent];
}

export function revealRecent(): void {
  set(false);
  AsyncStorage.removeItem(KEY).catch(() => undefined);
}

/** Hides Recent checks and persists it, then leaves the app on Android or replaces the page on web. */
export async function exitAfterQuickExit(): Promise<void> {
  set(true);
  await AsyncStorage.setItem(KEY, '1').catch(() => undefined);
  if (Platform.OS === 'android') BackHandler.exitApp();
  else if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.replace(NEUTRAL_SITE);
}

export function resetQuickExitForTests(): void {
  hidden = false;
  loaded = null;
  listeners.clear();
}
