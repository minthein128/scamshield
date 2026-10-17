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

/** Dev builds only: EXPO_PUBLIC_OFFLINE_MOCK=1 skips URL resolution so the offline mock answers. */
export const OFFLINE_MOCK = __DEV__ && process.env.EXPO_PUBLIC_OFFLINE_MOCK === '1';
export const CLOUD_RUN_API_URL = 'https://sg-dev-808112092414.asia-southeast1.run.app';
export const STABLE_API_URL = (process.env.EXPO_PUBLIC_STABLE_API_URL?.trim() || CLOUD_RUN_API_URL).replace(/\/+$/, '');
export const FALLBACK_API_URL = (process.env.EXPO_PUBLIC_FALLBACK_API_URL?.trim() ?? '').replace(/\/+$/, '');
// Dev builds without a URL keep using the offline mock.
export const API_URL = process.env.EXPO_PUBLIC_API_URL?.trim() || (__DEV__ ? '' : STABLE_API_URL);

// Metro only inlines literal process.env.EXPO_PUBLIC_* reads.
export const FIREBASE_CONFIG = readFirebaseConfig({
  EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
});

export const GOOGLE_SIGNIN = process.env.EXPO_PUBLIC_GOOGLE_SIGNIN === '1';
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? '';
export const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL?.trim() || 'https://saferoute-aibc.web.app').replace(/\/+$/, '');
export const APK_URL = process.env.EXPO_PUBLIC_APK_URL?.trim() || `${SITE_URL}/saferoute.apk`;
export const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID?.trim() ?? '';

