import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';

export const MOCK_AUTH = import.meta.env.VITE_MOCK_AUTH === '1';

const app = MOCK_AUTH
  ? null
  : initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    });
const auth = app ? getAuth(app) : null;

export interface AuthUser { email: string; getIdToken: () => Promise<string> }
const wrap = (u: User): AuthUser => ({ email: u.email ?? '', getIdToken: () => u.getIdToken() });

export function watchAuth(cb: (u: AuthUser | null) => void): () => void {
  if (!auth) {
    cb({ email: 'mock@saferoute.dev', getIdToken: async () => 'mock-token' });
    return () => {};
  }
  return onAuthStateChanged(auth, (u) => cb(u ? wrap(u) : null));
}
export const signInGoogle = async () => {
  if (auth) await signInWithPopup(auth, new GoogleAuthProvider());
};
export const signInEmail = async (email: string, password: string) => {
  if (auth) await signInWithEmailAndPassword(auth, email, password);
};
export const signOut = async () => {
  if (auth) await fbSignOut(auth);
  else location.reload();
};
