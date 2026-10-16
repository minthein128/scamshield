import AsyncStorage from '@react-native-async-storage/async-storage';
import { readLog, resetDiagMemory } from '../lib/diagLog';
import { withAuthLog } from '../services/accounts';
import { signInWithGoogle } from '../services/social.native';

const mockLink = jest.fn();
jest.mock('firebase/auth', () => ({
  linkWithCredential: (...a: unknown[]) => mockLink(...a),
  signInWithCredential: jest.fn(),
  GoogleAuthProvider: { credential: () => ({}) },
  FacebookAuthProvider: { credential: () => ({}) },
}));

const mockSignIn = jest.fn();
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { configure: jest.fn(), hasPlayServices: jest.fn().mockResolvedValue(true), signIn: (...a: unknown[]) => mockSignIn(...a) },
  isErrorWithCode: (e: unknown) => Boolean(e && typeof e === 'object' && 'code' in e),
  statusCodes: { SIGN_IN_CANCELLED: '12501' },
}));
jest.mock('expo-auth-session', () => ({ AuthRequest: jest.fn(), ResponseType: { Token: 'token' }, makeRedirectUri: jest.fn() }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));

beforeEach(async () => {
  await AsyncStorage.clear();
  resetDiagMemory();
  mockSignIn.mockReset();
});

describe('auth logging', () => {
  it('logs a failed attempt with its auth code', async () => {
    await expect(withAuthLog('emailSignIn', () => Promise.reject({ code: 'auth/invalid-credential' }))).rejects.toMatchObject({ code: 'auth/invalid-credential' });
    const list = await readLog();
    expect(list.map(e => e.event)).toEqual(['attempt', 'failed']);
    expect(list[1]).toMatchObject({ level: 'error', area: 'auth', d: { method: 'emailSignIn', code: 'auth/invalid-credential' } });
  });

  it('logs the native Google Sign-In code with the stage that failed', async () => {
    mockSignIn.mockRejectedValue({ code: '10', message: 'DEVELOPER_ERROR for ko.aung@example.com' });
    await expect(signInWithGoogle({} as never)).rejects.toMatchObject({ code: '10' });
    const [e] = await readLog();
    expect(e).toMatchObject({ area: 'auth', event: 'google_native_error', d: { stage: 'googleSignIn', code: '10' } });
    expect(JSON.stringify(e)).not.toContain('example.com');
  });

  it('does not log a user cancel as an error', async () => {
    mockSignIn.mockRejectedValue({ code: '12501' });
    await expect(signInWithGoogle({} as never)).rejects.toMatchObject({ code: 'auth/popup-closed-by-user' });
    expect(await readLog()).toEqual([]);
  });

  it('logs success with a hashed uid only', async () => {
    await withAuthLog('google', async () => undefined, () => 'uid-abcdef-1234567890');
    const [, ok] = await readLog();
    expect(ok.d.uid).toMatch(/^h[0-9a-f]{5}$/);
  });
});
