import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { type Auth, getReactNativePersistence, initializeAuth } from 'firebase/auth';

import { firebaseConfig, firebaseConfigured } from './config';

/**
 * The Firebase app and its auth, initialised once.
 *
 * `initializeAuth` with an explicit persistence, NOT `getAuth`. Without it the
 * SDK keeps the session in memory and every cold start signs the reader out.
 * That is survivable for a Google account — `signInSilently` can restore it —
 * and fatal for an email link, where the only way back in is another email.
 * Somebody who paid $79.99 should not need a fresh link every morning.
 *
 * `getReactNativePersistence` is typed by src/types/firebase-auth-rn.d.ts; the
 * export is real and lives behind a bundler condition tsc does not apply. The
 * reasoning is written out there.
 */
let auth: Auth | null = null;
let attempted = false;

export function firebaseAuth(): Auth | null {
  if (attempted) {
    return auth;
  }
  attempted = true;

  if (!firebaseConfigured) {
    return null;
  }

  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // Fast Refresh can run this twice against an app that already has auth
    // attached, and a misconfigured project throws here too. Either way the
    // caller gets null and reports "not signed in" — the free app is
    // untouched, and a crash on launch over an optional account would be a
    // far worse trade.
    auth = null;
  }
  return auth;
}

export { firebaseConfigured } from './config';
