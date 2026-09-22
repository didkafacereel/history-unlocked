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

  /**
   * Pretends to post a link, so the two states of the email form can be built
   * and reviewed on web — the same reason this whole stand-in exists.
   *
   * It validates the address and then does nothing, which is the honest
   * imitation: no mail is sent, and the panel above already says "Local test
   * account" whenever this provider is the one answering.
   */
  sendEmailLink: async (email) => {
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      return { ok: false, reason: 'bad-email' };
    }
    return { ok: true };
  },

  /*
   * No `completeEmailLink`, deliberately, and the omission is the fix for a
   * bug this stand-in briefly had.
   *
   * The root layout hands EVERY incoming url to the auth service and relies on
   * the service to recognise its own links — which the real one does, by
   * asking Firebase whether the url is a sign-in link. This stand-in has no
   * way to tell one url from another, and a version that accepted any of them
   * signed the local account in on every single launch, because on web
   * `Linking.useURL()` returns the address of the page you are already on.
   *
   * Leaving the method off makes that call a no-op here. `sendEmailLink`
   * stays, because the form's two states are the thing worth reviewing on web
   * and posting nothing is a truthful imitation of posting nothing.
   */

  /**
   * Always null, and that is the point.
   *
   * A stand-in cannot produce a token any server would believe, and inventing
   * something token-shaped would mean the founders client sent it, the server
   * rejected it, and the failure surfaced as a confusing 401 rather than as
   * "this build has no real account". Null short-circuits in the client, which
   * then reports "unknown" — the truth.
   */
  idToken: async () => null,
};
