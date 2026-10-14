import { type App, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { log } from './log.js';

export interface Identity {
  uid: string;
  anonymous: boolean;
}

export type TokenVerifier = (token: string) => Promise<Identity | null>;

export function bearerToken(header: string | undefined): string | undefined {
  const match = /^Bearer\s+(\S+)$/i.exec(header?.trim() ?? '');
  return match?.[1];
}

export function createFirebaseVerifier(projectId: string): TokenVerifier {
  const app: App = getApps()[0] ?? initializeApp({ projectId });
  const auth = getAuth(app);
  return async (token) => {
    try {
      const decoded = await auth.verifyIdToken(token);
      return { uid: decoded.uid, anonymous: decoded.firebase?.sign_in_provider === 'anonymous' };
    } catch (err) {
      log('WARNING', 'token_rejected', { error: (err as Error).message.slice(0, 120) });
      return null;
    }
  };
}
