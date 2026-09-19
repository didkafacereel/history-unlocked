import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthService, AuthUser } from './AuthService';

export * from './AuthService';

/**
 * Base resolution (web + typecheck): a stand-in.
 *
 * Google's native sign-in module is never referenced here, so it stays out of
 * the web bundle — the same split billing uses. Native builds resolve
 * index.native.ts instead.
 *
 * The stand-in signs in a fixed local identity so the account UI, and
 * everything keyed on it, can be built and reviewed on web. It says out loud
 * that it is a stand-in; an app that appears to have signed you in when it has
 * not is worse than one that admits it cannot.
 */

const STORAGE_KEY = 'history-unlocked.auth.stub.v1';

const STUB_USER: AuthUser = {
  id: 'stub-local-user',
  name: 'Local test account',
  email: 'local@example.com',
};

export const stubAuthService: AuthService = {
  available: true,
  isStub: true,

  getUser: async () => {
    try {
      return (await AsyncStorage.getItem(STORAGE_KEY)) ? STUB_USER : null;
    } catch {
      return null;
    }
  },

  signIn: async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
    } catch {
      return { ok: false, reason: 'failed' };
    }
    return { ok: true, user: STUB_USER };
  },

  signOut: async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to recover from; the next getUser simply reports the truth.
    }
  },
};

export function getAuthService(): AuthService {
  return stubAuthService;
}
