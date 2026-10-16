import { authErrorMessage, linkOrSignIn } from '../services/accounts';
import { t } from '../i18n';

const mockLink = jest.fn();
const mockSignIn = jest.fn();
jest.mock('firebase/auth', () => ({
  linkWithCredential: (...a: unknown[]) => mockLink(...a),
  signInWithCredential: (...a: unknown[]) => mockSignIn(...a),
}));

const credential = { providerId: 'google.com' } as never;
const anon = () => ({ currentUser: { isAnonymous: true, getIdToken: jest.fn().mockResolvedValue('t') } }) as never;

describe('social credential linking', () => {
  beforeEach(() => {
    mockLink.mockReset();
    mockSignIn.mockReset();
  });

  it('links an anonymous user so the uid carries over', async () => {
    mockLink.mockResolvedValue({});
    await linkOrSignIn(anon(), credential);
    expect(mockLink).toHaveBeenCalled();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('falls back to sign-in when the credential already has an account', async () => {
    mockLink.mockRejectedValue({ code: 'auth/credential-already-in-use' });
    await linkOrSignIn(anon(), credential);
    expect(mockSignIn).toHaveBeenCalledWith(expect.anything(), credential);
  });

  it('rethrows other link errors', async () => {
    mockLink.mockRejectedValue({ code: 'auth/network-request-failed' });
    await expect(linkOrSignIn(anon(), credential)).rejects.toMatchObject({ code: 'auth/network-request-failed' });
  });

  it('signs in directly when nobody is anonymous', async () => {
    await linkOrSignIn({ currentUser: null } as never, credential);
    expect(mockSignIn).toHaveBeenCalled();
    expect(mockLink).not.toHaveBeenCalled();
  });
});

describe('auth error message', () => {
  const fallback = () => t('errors:auth.fallback');

  it('appends the native Google Sign-In status code to the fallback', () => {
    expect(authErrorMessage({ code: '10' })).toBe(`${fallback()} (code 10)`);
    expect(authErrorMessage({ code: 12500 })).toBe(`${fallback()} (code 12500)`);
    expect(authErrorMessage({ code: 'PLAY_SERVICES_NOT_AVAILABLE' })).toBe(`${fallback()} (code PLAY_SERVICES_NOT_AVAILABLE)`);
  });

  it('appends unmapped Firebase codes', () => {
    expect(authErrorMessage({ code: 'auth/internal-error' })).toBe(`${fallback()} (code auth/internal-error)`);
  });

  it('keeps mapped messages free of codes', () => {
    expect(authErrorMessage({ code: 'auth/popup-closed-by-user' })).toBe(t('errors:auth.popupClosed'));
  });

  it('shows the plain fallback when there is no code', () => {
    expect(authErrorMessage(new Error('boom'))).toBe(fallback());
    expect(authErrorMessage(null)).toBe(fallback());
    expect(authErrorMessage({ code: '  ' })).toBe(fallback());
  });
});
