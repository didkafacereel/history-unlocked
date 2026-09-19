import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Where the daily manifest comes from.
 *
 * Production points at a hosted archive via `EXPO_PUBLIC_MANIFEST_URL` (see
 * pipeline/README.md). In development we fall back to the Expo dev server
 * itself, which serves `public/manifest.json` — that way the full 366-day
 * archive is available locally without publishing anything, while the bundled
 * fixture stays small enough to ship.
 */

function devServerManifestUrl(): string | null {
  if (!__DEV__) {
    return null;
  }

  if (Platform.OS === 'web') {
    return typeof window === 'undefined' ? null : `${window.location.origin}/manifest.json`;
  }

  // On a device, Expo tells us where the dev server lives, e.g. "192.168.1.5:8081".
  const hostUri = Constants.expoConfig?.hostUri;
  return hostUri ? `http://${hostUri}/manifest.json` : null;
}

export const REMOTE_MANIFEST_URL: string | null =
  process.env.EXPO_PUBLIC_MANIFEST_URL?.trim() || devServerManifestUrl();

/**
 * The authored quiz questions, published beside the manifest.
 *
 * Derived from the manifest URL rather than configured separately: the two
 * files are written by the same command into the same folder, and a second
 * environment variable would only create a way for them to disagree.
 */
export const REMOTE_QUIZZES_URL: string | null = REMOTE_MANIFEST_URL
  ? REMOTE_MANIFEST_URL.replace(/[^/]*$/, 'quizzes.json')
  : null;

/** Network budget for the launch-path fetch — beyond this we use the cache. */
export const MANIFEST_FETCH_TIMEOUT_MS = 8_000;
