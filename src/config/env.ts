export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId?: string;
}

export function readFirebaseConfig(env: Record<string, string | undefined> = {}): FirebaseWebConfig | null {
  const apiKey = env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim();
  const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const appId = env.EXPO_PUBLIC_FIREBASE_APP_ID?.trim();
  if (!apiKey || !projectId || !appId) return null;
  return {
    apiKey,
    projectId,
    appId,
    authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() || `${projectId}.firebaseapp.com`,
    messagingSenderId: env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
  };
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';

// Metro only inlines literal process.env.EXPO_PUBLIC_* reads.
export const FIREBASE_CONFIG = readFirebaseConfig({
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
});

export const GOOGLE_SIGNIN_WEB = process.env.EXPO_PUBLIC_GOOGLE_SIGNIN === '1';

export const IS_MOCK_MODE = __DEV__ && !API_URL;
