import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { FacebookAuthProvider, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { FACEBOOK_APP_ID, GOOGLE_SIGNIN, GOOGLE_WEB_CLIENT_ID } from '../config/env';
import { diag } from '../lib/diagLog';
import { authErrorCode, linkOrSignIn } from './accounts';

WebBrowser.maybeCompleteAuthSession();

export const googleAvailable = GOOGLE_SIGNIN && Boolean(GOOGLE_WEB_CLIENT_ID);
export const facebookAvailable = Boolean(FACEBOOK_APP_ID);

const cancelled = () => Object.assign(new Error('cancelled'), { code: 'auth/popup-closed-by-user' });

export async function signInWithGoogle(auth: Auth): Promise<void> {
  GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID });
  let stage: 'playServices' | 'googleSignIn' | 'firebase' = 'playServices';
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    stage = 'googleSignIn';
    const result = await GoogleSignin.signIn();
    const idToken = result.type === 'success' ? result.data.idToken : null;
    if (!idToken) {
      diag.warn('auth', 'google_no_token', { result: result.type });
      throw cancelled();
    }
    stage = 'firebase';
    await linkOrSignIn(auth, GoogleAuthProvider.credential(idToken));
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) throw cancelled();
    if ((e as { code?: unknown })?.code === 'auth/popup-closed-by-user') throw e;
    diag.error('auth', 'google_native_error', { stage, code: authErrorCode(e) ?? 'unknown' });
    throw e;
  }
}

const FACEBOOK_AUTH = 'https://www.facebook.com/v19.0/dialog/oauth';

export async function signInWithFacebook(auth: Auth): Promise<void> {
  const request = new AuthSession.AuthRequest({
    clientId: FACEBOOK_APP_ID,
    scopes: ['public_profile', 'email'],
    responseType: AuthSession.ResponseType.Token,
    redirectUri: AuthSession.makeRedirectUri({ scheme: `fb${FACEBOOK_APP_ID}`, path: 'authorize' }),
    usePKCE: false,
    extraParams: { display: 'touch' },
  });
  const result = await request.promptAsync({ authorizationEndpoint: FACEBOOK_AUTH });
  if (result.type !== 'success') throw cancelled();
  const token = result.params.access_token;
  if (!token) throw cancelled();
  await linkOrSignIn(auth, FacebookAuthProvider.credential(token));
}
