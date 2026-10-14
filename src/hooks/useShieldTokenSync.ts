import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { onIdTokenChanged } from 'firebase/auth';
import { setShieldAuthToken } from 'shield-module';
import { getAuthInstance } from '../services/authInstance';

export function useShieldTokenSync(): void {
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const auth = getAuthInstance();
    if (!auth) return;
    const push = (token: string | null) => setShieldAuthToken(token).catch(() => undefined);
    const unsubscribe = onIdTokenChanged(auth, user => {
      user?.getIdToken().then(push).catch(() => undefined);
    });
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') auth.currentUser?.getIdToken().then(push).catch(() => undefined);
    });
    return () => {
      unsubscribe();
      sub.remove();
    };
  }, []);
}
