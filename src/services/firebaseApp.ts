import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { FIREBASE_CONFIG } from '../config/env';

export const firebaseEnabled = FIREBASE_CONFIG !== null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!FIREBASE_CONFIG) return null;
  return getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
}
