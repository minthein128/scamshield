import { useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { orientationPolicyFor } from '../lib/orientation';

/** Locks phones to portrait and lets tablets rotate. The screen size does not change on rotation. */
export function useOrientationPolicy(): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const { width, height } = Dimensions.get('screen');
    const apply = orientationPolicyFor(width, height) === 'portrait'
      ? ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
      : ScreenOrientation.unlockAsync();
    apply.catch(() => undefined);
  }, []);
}
