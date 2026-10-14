import { getAuth, type Auth } from 'firebase/auth';
import { getFirebaseApp } from './firebaseApp';

let cached: Auth | null = null;

export function getAuthInstance(): Auth | null {
  if (cached) return cached;
  const app = getFirebaseApp();
  if (!app) return null;
  cached = getAuth(app);
  return cached;
}
