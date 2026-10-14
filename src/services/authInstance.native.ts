import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getFirebaseApp } from './firebaseApp';

let cached: Auth | null = null;

export function getAuthInstance(): Auth | null {
  if (cached) return cached;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    cached = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    cached = getAuth(app);
  }
  return cached;
}
