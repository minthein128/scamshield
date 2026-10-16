import type { AuthStatus } from '../services/accounts';

export type ContactAccess = 'allowed' | 'signIn' | 'unavailable';

/** Saving a trusted contact needs a real provider account, not the anonymous one. */
export function contactAccess(status: AuthStatus): ContactAccess {
  if (status.kind === 'account') return 'allowed';
  if (status.kind === 'unavailable') return 'unavailable';
  return 'signIn';
}
