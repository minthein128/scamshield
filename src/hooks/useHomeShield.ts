import { Platform } from 'react-native';
import { useShieldControl, type ShieldControl } from './useShieldControl';

/** Dev web only: ?shieldStub=on|off fakes a ready shield so screenshots can show it on. */
function devStub(): ShieldControl | null {
  if (!__DEV__ || Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('shieldStub');
  if (value !== 'on' && value !== 'off') return null;
  return { support: 'ready', running: value === 'on', on: value === 'on', step: 'idle', error: null, setEnabled: async () => undefined, checkNow: async () => true };
}

export function useHomeShield(): ShieldControl {
  const control = useShieldControl();
  return devStub() ?? control;
}
