import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import { getShieldResult } from 'shield-module';
import type { CheckResponse, LanguageCode } from '../api/types';
import { SCREEN_SOURCE, reportIdFromUrl, screenFromUrl, toCheckResponse } from '../lib/shield';
import { useAppState } from '../state/AppState';

const handled = new Set<string>();

export function useShieldDeepLink(
  ready: boolean,
  open: (result: CheckResponse, language: LanguageCode) => void,
  openScreen?: (screen: 'GetHelp' | 'Shield') => void,
): void {
  const { language, saveCheck } = useAppState();

  useEffect(() => {
    if (!ready || Platform.OS !== 'android') return;
    const handle = async (url: string | null) => {
      const screen = screenFromUrl(url);
      if (screen) {
        openScreen?.(screen);
        return;
      }
      const id = reportIdFromUrl(url);
      if (!id || handled.has(id)) return;
      handled.add(id);
      const raw = await getShieldResult(id);
      if (!raw) return;
      const result = toCheckResponse(raw);
      await saveCheck(result, language, SCREEN_SOURCE).catch(() => undefined);
      open(result, language);
    };
    Linking.getInitialURL().then(handle).catch(() => undefined);
    const sub = Linking.addEventListener('url', e => handle(e.url));
    return () => sub.remove();
  }, [ready, language, saveCheck, open, openScreen]);
}
