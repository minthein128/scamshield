import { useEffect } from 'react';
import { Platform } from 'react-native';
import { setShieldShareSignals } from 'shield-module';
import { useAppState } from '../state/AppState';

/** Keeps the running shield's scam-pattern sharing in step with the user's opt-in. */
export function useShieldShareSync(): void {
  const { profile } = useAppState();
  const share = profile.shareSignals === true;
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    setShieldShareSignals(share).catch(() => undefined);
  }, [share]);
}
