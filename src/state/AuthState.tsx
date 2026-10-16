import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, onIdTokenChanged, type User } from 'firebase/auth';
import {
  ensureAnonymous,
  removeAccount,
  resetPassword,
  signInWithEmail,
  signOutToAnonymous,
  signUpWithEmail,
  withAuthLog,
  statusFromUser,
  type AuthStatus,
} from '../services/accounts';
import { diag, shortHash } from '../lib/diagLog';
import { getAuthInstance } from '../services/authInstance';
import { signInWithFacebook, signInWithGoogle } from '../services/social';
import { setTokenProvider } from '../services/token';

interface AuthValue {
  status: AuthStatus;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  google: () => Promise<void>;
  facebook: () => Promise<void>;
  sendReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const UNAVAILABLE: AuthStatus = { kind: 'unavailable' };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useMemo(() => getAuthInstance(), []);
  const [status, setStatus] = useState<AuthStatus>(auth ? { kind: 'loading' } : UNAVAILABLE);

  useEffect(() => {
    if (!auth) return;
    setTokenProvider(async () => {
      if (!auth.currentUser) await ensureAnonymous(auth).catch(() => undefined);
      return (auth.currentUser as User | null)?.getIdToken() ?? null;
    });
    const offState = onAuthStateChanged(auth, user => {
      diag.info('auth', 'state', { kind: user ? (user.isAnonymous ? 'anonymous' : 'account') : 'signedOut', ...(user ? { uid: shortHash(user.uid) } : {}) });
      setStatus(statusFromUser(user));
      if (!user) ensureAnonymous(auth).catch(() => undefined);
    });
    const offToken = onIdTokenChanged(auth, user => {
      if (user) setStatus(statusFromUser(user));
    });
    return () => {
      offState();
      offToken();
    };
  }, [auth]);

  const uid = useCallback(() => auth?.currentUser?.uid, [auth]);

  const need = useCallback(() => {
    if (!auth) throw new Error('Accounts are not available in this build.');
    return auth;
  }, [auth]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      signUp: async (email, password) => {
        await withAuthLog('emailSignUp', () => signUpWithEmail(need(), email, password), uid);
        setStatus(statusFromUser(need().currentUser));
      },
      signIn: (email, password) => withAuthLog('emailSignIn', () => signInWithEmail(need(), email, password), uid),
      google: async () => {
        await withAuthLog('google', () => signInWithGoogle(need()), uid);
        setStatus(statusFromUser(need().currentUser));
      },
      facebook: async () => {
        await withAuthLog('facebook', () => signInWithFacebook(need()), uid);
        setStatus(statusFromUser(need().currentUser));
      },
      sendReset: email => withAuthLog('reset', () => resetPassword(need(), email)),
      signOut: () => withAuthLog('signOut', () => signOutToAnonymous(need())),
      deleteAccount: () =>
        withAuthLog('deleteAccount', async () => {
          const user = need().currentUser;
          if (user) await removeAccount(user);
        }),
    }),
    [status, need, uid],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
