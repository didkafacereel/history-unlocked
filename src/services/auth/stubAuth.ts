import AsyncStorage from '@react-native-async-storage/async-storage';

import { AuthService, AuthUser } from './AuthService';

/**
 * The stand-in account, in a file neither platform shadows.
 *
 * It used to live in `index.ts`, and `index.native.ts` imported it from
 * `./index` — which on native resolves to `index.native.ts`, so the module was
 * importing itself. The identical mistake in the notifications service crashed
 * the first device build outright; this one had simply never run yet.
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
