/**
 * The Firebase project this app talks to.
 *
 * Plain environment variables rather than `google-services.json`. The JS SDK
 * takes a config object and needs no native config file and no config plugin —
 * confirmed against the SDK 56 guide before any of this was written — so the
 * one file Firebase wanted to hand us never has to enter a public repository
 * or an EAS file variable.
 *
 * These values are not secrets. They identify a project, they ship inside every
 * APK, and Firebase's own documentation says so. What protects the data is the
 * Firestore rules and the fact that every write goes through a Cloud Function.
 */

function read(name: string): string {
  return process.env[name]?.trim() ?? '';
}

export const firebaseConfig = {
  apiKey: read('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: read('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: read('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  appId: read('EXPO_PUBLIC_FIREBASE_APP_ID'),
} as const;

/**
 * Whether this build was given a project at all.
 *
 * False in a build with no variables set, and everything downstream then
 * reports "not signed in" rather than half-initialising. A reader on such a
 * build still gets the whole free app; they simply cannot become a founder,
 * which is the truthful state of a build with no backend.
 */
export const firebaseConfigured =
  firebaseConfig.apiKey.length > 0 &&
  firebaseConfig.projectId.length > 0 &&
  firebaseConfig.appId.length > 0;
