import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';

/** Dev web only: ?clipStub=1 fakes clipboard text so screenshots can show the Paste chip. */
function devStub(): boolean {
  return __DEV__ && Platform.OS === 'web' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('clipStub') === '1';
}

/** True when the clipboard holds text. Checks without reading it; always false on web. */
export function useClipboardHasText(): boolean {
  const [has, setHas] = useState(devStub());
  const refresh = useCallback(() => {
    if (Platform.OS === 'web') return;
    Clipboard.hasStringAsync().then(setHas).catch(() => setHas(false));
  }, []);
  useFocusEffect(refresh);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);
  return has;
}
