import { FacebookAuthProvider, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { FACEBOOK_APP_ID, GOOGLE_SIGNIN } from '../config/env';
import { popupLinkOrSignIn } from './accounts';

export const googleAvailable = GOOGLE_SIGNIN;
export const facebookAvailable = Boolean(FACEBOOK_APP_ID);

export async function signInWithGoogle(auth: Auth): Promise<void> {
  await popupLinkOrSignIn(auth, new GoogleAuthProvider(), e => GoogleAuthProvider.credentialFromError(e));
}

export async function signInWithFacebook(auth: Auth): Promise<void> {
  await popupLinkOrSignIn(auth, new FacebookAuthProvider(), e => FacebookAuthProvider.credentialFromError(e));
}
