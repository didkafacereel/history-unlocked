import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithCredential,
  signInWithEmailLink,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';

import { firebaseAuth } from '@/services/firebase';

import { AuthService, AuthUser, EmailLinkResult, SignInResult } from './AuthService';

/**
 * Accounts, backed by Firebase Auth.
 *
 * Two ways in, one identity out. Google is the fast path; an email link is
 * there because "sign in with Google" as the only option turns away everyone
 * who does not want their Google account attached to a purchase, and this app
 * asks for an account exactly once, for something permanent.
 *
 * THE ID IS THE FIREBASE UID, and that is load-bearing. `useAuthStore` hands it
 * to `Purchases.logIn`, so RevenueCat's app-user id becomes the same string,
 * and the webhook writes `entitlements/{uid}` that the founders functions read
 * back from a verified token. One identity end to end, with no table mapping
 * two systems to each other and no seam where they can disagree.
 *
 * Only Google and email, deliberately: Apple requires Sign in with Apple
 * alongside any other social login, but only for apps shipped on iOS, and there
 * is no iOS build. The moment one is planned, Apple has to be added here or the
 * app is rejected at review.
 *
 * Imported only from index.native.ts, so neither native module reaches the web
 * bundle.
 */

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || '';

export function hasGoogleClientId(): boolean {
  return WEB_CLIENT_ID.length > 0;
}

let configured = false;

function configureGoogle(): void {
  if (configured) {
    return;
  }
  // The WEB client id is correct here even on Android — it identifies the
  // backend that will verify the token, and using the Android client id instead
  // is the single most common reason this returns DEVELOPER_ERROR.
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, offlineAccess: false });
  configured = true;
}

function toUser(user: User): AuthUser {
  return {
    id: user.uid,
    name: user.displayName ?? '',
    email: user.email ?? '',
  };
}

/**
 * Firebase's email-link flow needs the address back when the link is opened,
 * and the link itself does not carry it — by design, so that intercepting the
 * link alone is not enough to sign in as somebody.
 */
const PENDING_EMAIL_KEY = 'history-unlocked.auth.pendingEmail.v1';

/**
 * Where the link lands. It has to be an authorised domain on the project, and
 * the project's own Firebase domain always is — which avoids making the
 * founders flow wait on a custom domain being set up and verified.
 */
const LINK_CONTINUE_URL = `https://${process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? ''}/finish-sign-in`;

const ANDROID_PACKAGE = 'com.historyunlocked.app';

export const firebaseAuthService: AuthService = {
  available: true,
  isStub: false,

  getUser: async () => {
    const auth = firebaseAuth();
    if (!auth) {
      return null;
    }
    // Firebase restores the session from AsyncStorage asynchronously, so the
    // current user is frequently still null on the first tick after launch.
    // Reading it directly here is what made a signed-in founder look signed
    // out for the first second of every cold start.
    const user = auth.currentUser ?? (await nextAuthState(auth));
    return user ? toUser(user) : null;
  },

  signIn: async (): Promise<SignInResult> => {
    const auth = firebaseAuth();
    if (!auth) {
      return { ok: false, reason: 'unavailable' };
    }
    configureGoogle();
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (result.type !== 'success') {
        return { ok: false, reason: 'cancelled' };
      }
      const idToken = result.data.idToken;
      if (!idToken) {
        // Google returned a user with no token to exchange. Nothing downstream
        // can be done with that, and treating it as success would leave the
        // app believing in an account Firebase has never heard of.
        return { ok: false, reason: 'failed' };
      }
      const credential = GoogleAuthProvider.credential(idToken);
      const signed = await signInWithCredential(auth, credential);
      return { ok: true, user: toUser(signed.user) };
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          return { ok: false, reason: 'cancelled' };
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          return { ok: false, reason: 'unavailable' };
        }
      }
      return { ok: false, reason: 'failed' };
    }
  },

  signOut: async () => {
    const auth = firebaseAuth();
    try {
      if (auth) {
        await firebaseSignOut(auth);
      }
    } catch {
      // Already signed out, or the SDK is unhappy. The store clears the local
      // user either way and the next check reports the truth.
    }
    try {
      configureGoogle();
      await GoogleSignin.signOut();
    } catch {
      // Signing out of Firebase is what matters; leaving the Google session
      // alone only means the next sign-in does not re-ask which account.
    }
  },

  idToken: async () => {
    const auth = firebaseAuth();
    const user = auth?.currentUser ?? null;
    if (!user) {
      return null;
    }
    try {
      // Not forced: the SDK refreshes on its own when the token is close to
      // expiry, and forcing a network round trip on every founders call would
      // make the register slow for no gain.
      return await user.getIdToken();
    } catch {
      return null;
    }
  },

  sendEmailLink: async (email): Promise<EmailLinkResult> => {
    const auth = firebaseAuth();
    if (!auth) {
      return { ok: false, reason: 'unavailable' };
    }
    const address = email.trim();
    // Deliberately loose. Real address validation is a losing game and the
    // definitive test is whether the letter arrives; this only catches the
    // typo that could not possibly be an address.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      return { ok: false, reason: 'bad-email' };
    }
    try {
      await sendSignInLinkToEmail(auth, address, {
        url: LINK_CONTINUE_URL,
        // Must be true: the sign-in has to finish inside the app, because the
        // point is to end up with a session here rather than in a browser.
        handleCodeInApp: true,
        android: { packageName: ANDROID_PACKAGE, installApp: false },
      });
      await AsyncStorage.setItem(PENDING_EMAIL_KEY, address);
      return { ok: true };
    } catch {
      return { ok: false, reason: 'failed' };
    }
  },

  completeEmailLink: async (url): Promise<SignInResult> => {
    const auth = firebaseAuth();
    if (!auth) {
      return { ok: false, reason: 'unavailable' };
    }
    if (!isSignInWithEmailLink(auth, url)) {
      return { ok: false, reason: 'failed' };
    }
    let address: string | null = null;
    try {
      address = await AsyncStorage.getItem(PENDING_EMAIL_KEY);
    } catch {
      address = null;
    }
    if (!address) {
      // The link was opened on a device that never asked for it. Firebase
      // requires the address precisely so that a forwarded or intercepted link
      // cannot sign anybody in on its own.
      return { ok: false, reason: 'failed' };
    }
    try {
      const signed = await signInWithEmailLink(auth, address, url);
      await AsyncStorage.removeItem(PENDING_EMAIL_KEY);
      return { ok: true, user: toUser(signed.user) };
    } catch {
      return { ok: false, reason: 'failed' };
    }
  },
};

/**
 * Wait for the first definite answer about who is signed in.
 *
 * `onAuthStateChanged` fires once the SDK has finished reading persistence,
 * which is the only moment "currentUser is null" means "nobody" rather than
 * "not yet". Bounded, because a listener that never fires would otherwise hang
 * the launch check forever.
 */
function nextAuthState(auth: NonNullable<ReturnType<typeof firebaseAuth>>): Promise<User | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, 4000);
    const unsubscribe = auth.onAuthStateChanged((user) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(user);
    });
  });
}
