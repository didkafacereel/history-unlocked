import {
  GoogleSignin,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { AuthService, AuthUser, SignInResult } from './AuthService';

/**
 * Google sign-in, Android-first.
 *
 * Only Google, deliberately: Apple requires Sign in with Apple alongside any
 * other social login, but only for apps shipped on iOS — and there is no iOS
 * build. The moment one is planned, Apple has to be added here or the app is
 * rejected at review. That is a launch blocker, not a nice-to-have.
 *
 * Imported only from index.native.ts, so the native module never enters the
 * web bundle.
 */

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || '';

export function hasGoogleClientId(): boolean {
  return WEB_CLIENT_ID.length > 0;
}

let configured = false;

function configure(): void {
  if (configured) {
    return;
  }
  // The WEB client id is correct here even on Android — it is what identifies
  // the backend that will verify the token, and using the Android client id
  // instead is the single most common reason this returns DEVELOPER_ERROR.
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, offlineAccess: false });
  configured = true;
}

function toUser(raw: {
  user: { id: string; name: string | null; email: string };
}): AuthUser {
  return {
    id: raw.user.id,
    name: raw.user.name ?? '',
    email: raw.user.email,
  };
}

export const googleAuthService: AuthService = {
  available: true,
  isStub: false,

  getUser: async () => {
    configure();
    try {
      const current = await GoogleSignin.signInSilently();
      return current.type === 'success' ? toUser(current.data) : null;
    } catch {
      // Silent sign-in failing means "not signed in", never an error worth
      // surfacing — the reader did not ask for anything.
      return null;
    }
  },

  signIn: async (): Promise<SignInResult> => {
    configure();
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (result.type !== 'success') {
        return { ok: false, reason: 'cancelled' };
      }
      return { ok: true, user: toUser(result.data) };
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
    configure();
    try {
      await GoogleSignin.signOut();
    } catch {
      // Already signed out, or the module is unhappy; either way the store
      // clears the local user and the next silent check reports the truth.
    }
  },
};
