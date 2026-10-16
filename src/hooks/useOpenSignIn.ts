import { useCallback, useContext } from 'react';
import { NavigationContext } from '@react-navigation/native';

/** Opens the existing Account screen in sign-in mode. A no-op outside a navigator. */
export function useOpenSignIn(): () => void {
  const navigation = useContext(NavigationContext);
  return useCallback(() => {
    navigation?.navigate('Account', { mode: 'signIn' });
  }, [navigation]);
}
