import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  linkWithCredential,
  linkWithPopup,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type Auth,
  type AuthCredential,
  type AuthProvider,
  type User,
} from 'firebase/auth';
import { t } from '../i18n';
import { diag, shortHash } from '../lib/diagLog';

export type AuthStatus =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'anonymous'; uid: string }
  | { kind: 'account'; uid: string; email: string };

export function statusFromUser(user: User | null): AuthStatus {
  if (!user) return { kind: 'loading' };
  if (user.isAnonymous) return { kind: 'anonymous', uid: user.uid };
  return { kind: 'account', uid: user.uid, email: user.email ?? '' };
}

const MESSAGE_KEYS = {
  'auth/email-already-in-use': 'errors:auth.emailInUse',
  'auth/credential-already-in-use': 'errors:auth.credentialInUse',
  'auth/invalid-email': 'errors:auth.invalidEmail',
  'auth/weak-password': 'errors:auth.weakPassword',
  'auth/missing-password': 'errors:auth.missingPassword',
  'auth/invalid-credential': 'errors:auth.badCredential',
  'auth/wrong-password': 'errors:auth.badCredential',
  'auth/user-not-found': 'errors:auth.badCredential',
  'auth/too-many-requests': 'errors:auth.tooManyRequests',
  'auth/network-request-failed': 'errors:auth.network',
  'auth/popup-closed-by-user': 'errors:auth.popupClosed',
  'auth/account-exists-with-different-credential': 'errors:auth.differentMethod',
  'auth/unauthorized-domain': 'errors:auth.unauthorizedDomain',
  'auth/popup-blocked': 'errors:auth.popupBlocked',
  'auth/requires-recent-login': 'errors:auth.recentLogin',
  'auth/operation-not-allowed': 'errors:auth.notAllowed',
} as const;

export function authErrorCode(error: unknown): string | null {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code !== 'string' && typeof code !== 'number') return null;
  const text = String(code).trim();
  return text ? text.slice(0, 40) : null;
}

export function authErrorMessage(error: unknown): string {
  const code = authErrorCode(error);
  if (code && code in MESSAGE_KEYS) return t(MESSAGE_KEYS[code as keyof typeof MESSAGE_KEYS]);
  const fallback = t('errors:auth.fallback');
  return code ? `${fallback} (code ${code})` : fallback;
}

export type AuthMethod = 'google' | 'facebook' | 'emailSignIn' | 'emailSignUp' | 'reset' | 'signOut' | 'deleteAccount' | 'anonymous';

/** Logs the attempt, the outcome and the error code of an auth action, then passes the result through. */
export async function withAuthLog<T>(method: AuthMethod, action: () => Promise<T>, uidOf?: () => string | undefined): Promise<T> {
  const started = Date.now();
  diag.info('auth', 'attempt', { method });
  try {
    const result = await action();
    const uid = uidOf?.();
    diag.info('auth', 'ok', { method, ms: Date.now() - started, ...(uid ? { uid: shortHash(uid) } : {}) });
    return result;
  } catch (e) {
    const code = authErrorCode(e) ?? 'unknown';
    diag[code === 'auth/popup-closed-by-user' ? 'warn' : 'error']('auth', 'failed', { method, code, ms: Date.now() - started });
    throw e;
  }
}

export async function ensureAnonymous(auth: Auth): Promise<void> {
  if (!auth.currentUser) await withAuthLog('anonymous', () => signInAnonymously(auth));
}

export async function signUpWithEmail(auth: Auth, email: string, password: string): Promise<void> {
  const user = auth.currentUser;
  const credential = EmailAuthProvider.credential(email.trim(), password);
  if (user?.isAnonymous) {
    await linkWithCredential(user, credential);
    await user.getIdToken(true);
    return;
  }
  await createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function signInWithEmail(auth: Auth, email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

const EXISTS = ['auth/credential-already-in-use', 'auth/email-already-in-use'];

export async function linkOrSignIn(auth: Auth, credential: AuthCredential): Promise<void> {
  const user = auth.currentUser;
  if (user?.isAnonymous) {
    try {
      await linkWithCredential(user, credential);
      await user.getIdToken(true);
      return;
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (!EXISTS.includes(code)) throw e;
      await signInWithCredential(auth, credential);
      return;
    }
  }
  await signInWithCredential(auth, credential);
}

export async function popupLinkOrSignIn(auth: Auth, provider: AuthProvider, credentialFromError: (e: never) => AuthCredential | null): Promise<void> {
  const user = auth.currentUser;
  if (user?.isAnonymous) {
    try {
      await linkWithPopup(user, provider as never);
      await user.getIdToken(true);
      return;
    } catch (e) {
      if ((e as { code?: string }).code !== 'auth/credential-already-in-use') throw e;
      const credential = credentialFromError(e as never);
      if (!credential) throw e;
      await signInWithCredential(auth, credential);
      return;
    }
  }
  await signInWithPopup(auth, provider as never);
}

export async function resetPassword(auth: Auth, email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutToAnonymous(auth: Auth): Promise<void> {
  await signOut(auth);
  await signInAnonymously(auth);
}

export async function removeAccount(user: User): Promise<void> {
  await deleteUser(user);
}
