import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
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
  type User,
} from 'firebase/auth';

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

const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
  'auth/credential-already-in-use': 'That account already exists. Sign in instead.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Use a password with at least 6 characters.',
  'auth/missing-password': 'Enter your password.',
  'auth/invalid-credential': 'The email or password is not right.',
  'auth/wrong-password': 'The email or password is not right.',
  'auth/user-not-found': 'The email or password is not right.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'No connection. Check your internet and try again.',
  'auth/popup-closed-by-user': 'The Google window was closed before sign-in finished.',
  'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups and try again.',
  'auth/requires-recent-login': 'For your safety, sign in again and then repeat this step.',
  'auth/operation-not-allowed': 'This sign-in method is not available yet.',
};

export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  return (code && MESSAGES[code]) || 'Something went wrong. Please try again.';
}

export async function ensureAnonymous(auth: Auth): Promise<void> {
  if (!auth.currentUser) await signInAnonymously(auth);
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

export async function signInWithGoogle(auth: Auth): Promise<void> {
  const provider = new GoogleAuthProvider();
  const user = auth.currentUser;
  if (user?.isAnonymous) {
    try {
      await linkWithPopup(user, provider);
      await user.getIdToken(true);
      return;
    } catch (e) {
      if ((e as { code?: string }).code !== 'auth/credential-already-in-use') throw e;
      const credential = GoogleAuthProvider.credentialFromError(e as never);
      if (!credential) throw e;
      await signInWithCredential(auth, credential);
      return;
    }
  }
  await signInWithPopup(auth, provider);
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
