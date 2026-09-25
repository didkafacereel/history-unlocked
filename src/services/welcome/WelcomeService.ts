/**
 * The launch gift: the first 5,000 readers to sign in get a week of Pro, free.
 *
 * The server owns it — how many are left, who has one, when theirs ends — and
 * the app only asks. Copies of the two numbers live here so a screen can say
 * "5,000 free weeks" before the first answer arrives; the contract test fails
 * if they drift from `firebase/functions/src/constants.ts`.
 */
export const WELCOME_CAP = 5000;
export const WELCOME_DAYS = 7;

export interface WelcomeGrant {
  /** This reader was the Nth to claim. */
  number: number;
  /** Epoch ms, by the SERVER's clock. */
  startedAt: number;
  endsAt: number;
}

export interface WelcomeStatus {
  /** Weeks still unclaimed, or null when the server could not be reached. */
  remaining: number | null;
  /** This reader's week, or null when they have none (or are signed out). */
  mine: WelcomeGrant | null;
  /** The server's clock when it answered, to correct for a wrong phone clock. */
  serverNow: number | null;
}

export type WelcomeClaim =
  | { status: 'granted' | 'existing'; grant: WelcomeGrant; remaining: number; serverNow: number }
  | { status: 'sold-out'; remaining: 0; serverNow: number }
  | { status: 'unavailable' };

export interface WelcomeService {
  status(): Promise<WelcomeStatus>;
  /** Claim this reader's week. Idempotent; needs a signed-in reader. */
  claim(): Promise<WelcomeClaim>;
  /** True for the device-local stand-in. */
  readonly isLocal: boolean;
}
