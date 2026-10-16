import { linkOrSignIn } from '../services/accounts';

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
