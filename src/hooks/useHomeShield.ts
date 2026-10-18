import { useState } from 'react';
import { Platform } from 'react-native';
import { useShieldControl, type ShieldControl } from './useShieldControl';

/** Dev web only: ?shieldStub=on|off fakes a ready shield that the button can toggle. */
function stubStart(): boolean | null {
  if (!__DEV__ || Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('shieldStub');
  return value === 'on' || value === 'off' ? value === 'on' : null;
}

export function useHomeShield(): ShieldControl {
  const control = useShieldControl();
  const start = stubStart();
  const [fake, setFake] = useState(start === true);
  if (start === null) return control;
  return { support: 'ready', running: fake, on: fake, step: 'idle', error: null, setEnabled: async next => setFake(next), checkNow: async () => true };
}
