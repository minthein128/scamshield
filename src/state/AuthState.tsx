import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  ensureAnonymous,
  removeAccount,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signOutToAnonymous,
  signUpWithEmail,
  statusFromUser,
  type AuthStatus,
} from '../services/accounts';
import { getAuthInstance } from '../services/authInstance';
import { setTokenProvider } from '../services/token';

interface AuthValue {
  status: AuthStatus;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  google: () => Promise<void>;
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
    return onAuthStateChanged(auth, user => {
      setStatus(statusFromUser(user));
      if (!user) ensureAnonymous(auth).catch(() => undefined);
    });
  }, [auth]);

  const need = useCallback(() => {
    if (!auth) throw new Error('Accounts are not available in this build.');
    return auth;
  }, [auth]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      signUp: (email, password) => signUpWithEmail(need(), email, password),
      signIn: (email, password) => signInWithEmail(need(), email, password),
      google: () => signInWithGoogle(need()),
      sendReset: email => resetPassword(need(), email),
      signOut: () => signOutToAnonymous(need()),
      deleteAccount: async () => {
        const user = need().currentUser;
        if (user) await removeAccount(user);
      },
    }),
    [status, need],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
