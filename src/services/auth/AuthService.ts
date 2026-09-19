/**
 * Signing in — optional, and only where something would otherwise be lost.
 *
 * A free reader never sees this. Everything they have (what they have read,
 * their streak, their recall schedule) lives on the device and asking them to
 * make an account before their first fact would cost far more readers than it
 * could ever be worth.
 *
 * It exists for the three things that CANNOT survive a reinstall without it:
 *  - the founder seat, which is an identity, not a setting
 *  - the day they keep, which carries their name in the archive
 *  - their vote, which has to be one per person rather than one per install
 *
 * Signing in re-keys RevenueCat to the account (`logIn`), so entitlement,
 * founder standing and votes all follow the person to their next phone instead
 * of dying with the handset.
 */

export interface AuthUser {
  /** Stable across devices. This is what the backend keys everything on. */
  id: string;
  /** What the app shows. May be empty if the provider gives no name. */
  name: string;
  email: string;
}

export type SignInResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: 'cancelled' | 'unavailable' | 'failed' };

export interface AuthService {
  /** The signed-in user, or null. Resolved from the provider, not a cache. */
  getUser(): Promise<AuthUser | null>;
  signIn(): Promise<SignInResult>;
  signOut(): Promise<void>;
  /**
   * Whether this platform can sign in at all. False on web and in Expo Go,
   * where the native Google module is absent — the account panel says so
   * rather than offering a button that cannot work.
   */
  readonly available: boolean;
  /** True for the stand-in used on web and in development. */
  readonly isStub: boolean;
}
