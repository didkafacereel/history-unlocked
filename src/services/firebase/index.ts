import type { Auth } from 'firebase/auth';

/**
 * Base resolution (web + typecheck): no Firebase.
 *
 * The web build exists for development and for the share pages; it has no
 * billing, no native Google sign-in, and therefore nothing to sign in to.
 * Keeping the SDK out of this half also keeps it out of the web bundle.
 *
 * Native builds resolve index.native.ts instead.
 */
export function firebaseAuth(): Auth | null {
  return null;
}

export { firebaseConfigured } from './config';
