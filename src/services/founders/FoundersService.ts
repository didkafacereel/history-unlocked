/**
 * The founders boundary — a numbered lifetime seat, and the calendar day that
 * comes with it.
 *
 * Both facts are GLOBAL: "Founder #47" has to be unique across everyone, and a
 * date can only be kept by so many people. Neither can be decided on a phone,
 * so this interface is written for a server that does not exist yet, and the
 * dev provider stands in until it does — the same shape `PurchaseService`
 * already uses for billing.
 *
 * Provider resolution mirrors billing:
 *   no EXPO_PUBLIC_FOUNDERS_API → dev provider (device-local, honest about it)
 *   configured                  → remote provider
 */

/**
 * Lifetime is sold in generations.
 *
 * A single cap forces an ugly choice the day it fills: close the tier and turn
 * away money, or raise it and break the promise the first buyers paid for.
 * Generations avoid both. The first band is gone forever once it is gone —
 * nobody can become first-generation later, which is the whole point — and the
 * line simply moves on to the next band at a higher price.
 *
 * The generation is DERIVED from the seat number rather than stored, so it can
 * never disagree with it: #47 is first-generation by arithmetic, not by a flag
 * somebody could set.
 */
export interface FounderGeneration {
  /** 1-based. */
  ordinal: number;
  /** Roman numeral, how the badge shows it. */
  numeral: string;
  name: string;
  /** Seat numbers in this band, inclusive. */
  firstSeat: number;
  lastSeat: number;
  /** What this band costs. Later generations pay more — and can see they do. */
  price: string;
}

/**
 * Priced against the $39.99 annual plan at exactly 2x, 3x and 4x.
 *
 * The first band is deliberately the cheapest thing here, and not because it is
 * worth less. The market norm for lifetime is 4-5x annual, but that norm
 * belongs to apps with a track record; a reader buying into an unlaunched
 * archive is carrying the risk that it never grows, and the price should say
 * so. The honest line for the ladder is not "later costs more because it is
 * scarce" — it is **you pay less because you took the risk earlier**, which is
 * both true and checkable.
 *
 * The arithmetic underneath: at a 66% median first-renewal, an annual
 * subscriber is worth roughly $95-115 over their life at this price, so the
 * first band is close to revenue-neutral against the average one — and most lifetime buyers are people
 * who would never have subscribed at all, which makes them additional revenue
 * rather than cannibalised revenue.
 */
/** Leap year, so 29 February is a date somebody can own. */
const DATES_IN_YEAR = 366;

/**
 * How many founders may keep the same date. One — the date is theirs.
 *
 * This was three, and the argument for three was written down: a single keeper
 * makes 366 the hard ceiling on lifetime sales, and it turns birthdays into a
 * land grab where the first buyers take every date anyone actually wants.
 * Both of those are still true, and the decision went the other way anyway.
 *
 * What three cost is the thing being sold. "Your name is on 3 March, alongside
 * two others" is a mailing list. "3 March is yours" is a deed, and it is the
 * only thing this app can offer that no competitor can copy, because the
 * product IS a calendar and there is exactly one 3 March. A land grab is what
 * a scarce thing looks like when it is real.
 *
 * The ceiling is the honest consequence: 366 seats, ever. Priced accordingly.
 */
export const KEEPERS_PER_DATE = 1;

/**
 * Total day-keeping places, and therefore total seats.
 *
 * Every number below is derived from the calendar so the promise is arithmetic
 * rather than hope: the last seat sold is the last day there is. An earlier
 * version set the seat count by hand at 1500 against 1098 places, which would
 * have sold 402 people a date that did not exist.
 */
export const KEEPER_PLACES = DATES_IN_YEAR * KEEPERS_PER_DATE;

const GENERATION_COUNT = 3;
const SEATS_PER_GENERATION = KEEPER_PLACES / GENERATION_COUNT;

function band(ordinal: number): { firstSeat: number; lastSeat: number } {
  return {
    firstSeat: (ordinal - 1) * SEATS_PER_GENERATION + 1,
    lastSeat: ordinal * SEATS_PER_GENERATION,
  };
}

export const FOUNDER_GENERATIONS: FounderGeneration[] = [
  { ordinal: 1, numeral: 'I', name: 'First Generation', ...band(1), price: '$79.99' },
  { ordinal: 2, numeral: 'II', name: 'Second Generation', ...band(2), price: '$119.99' },
  { ordinal: 3, numeral: 'III', name: 'Third Generation', ...band(3), price: '$159.99' },
];

/** Every seat there will ever be. After this, Lifetime closes for good. */
export const FOUNDER_SEATS =
  FOUNDER_GENERATIONS[FOUNDER_GENERATIONS.length - 1]?.lastSeat ?? 0;

/** Which generation a seat belongs to. Null once the seats run out. */
export function generationForSeat(seat: number): FounderGeneration | null {
  return FOUNDER_GENERATIONS.find((g) => seat >= g.firstSeat && seat <= g.lastSeat) ?? null;
}

/** The generation currently on sale, given how many seats are gone. */
export function generationOnSale(seatsTaken: number): FounderGeneration | null {
  return generationForSeat(seatsTaken + 1);
}

/**
 * How long a newly claimed name takes to appear on its date.
 *
 * Claims are recorded the moment they are made, but the name is written into
 * the published archive on its daily rebuild, so a founder who claims at noon
 * sees their day carry their name the following morning. Stated in the app
 * rather than glossed over: someone who has just paid and does not see their
 * name will assume it failed, and an unexplained wait is how a purchase turns
 * into a support message.
 */
export const KEEPER_REFRESH_NOTE = 'Names are written into the archive once a day.';

/**
 * Where a founder goes when they picked the wrong day.
 *
 * The claim stays one-way in the app — a day you can swap next week is a
 * setting, and the scarcity only means anything if the register is stable. But
 * one-way with no recourse at all turns a mis-tap on a $79.99 purchase into a
 * permanent grievance, so there is a door: a human one, within a day, by
 * writing.
 *
 * Deliberately not a button. Self-service swapping would need the whole
 * release-and-reclaim path built, tested and defended against someone cycling
 * dates to squat the good ones; a mailbox needs none of that and the volume
 * will be a handful of messages a year.
 *
 * A constant rather than an environment variable, unlike the feedback
 * destination: this is the published support address that already appears in
 * the privacy policy, and a build that forgot to set it would leave a founder
 * with no recourse named at all.
 */
export const KEEPER_SUPPORT_EMAIL = 'support@gridconvertpro.com';
export const KEEPER_CHANGE_NOTE = `One date, chosen once. Picked the wrong day? Write to ${KEEPER_SUPPORT_EMAIL} within 24 hours.`;

export interface FounderStatus {
  /** 1-based seat number, or null when this reader is not a founder. */
  seat: number | null;
  /** "MM-DD" this founder keeps, or null when they have not claimed one. */
  keptDate: string | null;
  /** Display name shown on the kept date. Empty until they set one. */
  displayName: string;
  /** Seats already taken — the paywall's honest scarcity line. */
  seatsTaken: number;
}

export interface DateAvailability {
  dateKey: string;
  /** Names already keeping this date, in claim order. */
  keepers: string[];
  free: boolean;
}

export type ClaimResult =
  | { ok: true; status: FounderStatus }
  | { ok: false; reason: 'taken' | 'already-claimed' | 'not-a-founder' | 'unavailable' };

export interface FoundersService {
  /** Current reader's standing. Cheap; called on the profile and the paywall. */
  getStatus(): Promise<FounderStatus>;
  /** Allocate a seat on a lifetime purchase. Idempotent per reader. */
  claimSeat(): Promise<FounderStatus>;
  /** Who already keeps this date. */
  checkDate(dateKey: string): Promise<DateAvailability>;
  /** Keep a date under `displayName`. One date per founder, ever. */
  claimDate(dateKey: string, displayName: string): Promise<ClaimResult>;
  /** Names keeping a date, for the register card. Empty when none or offline. */
  keepersFor(dateKey: string): Promise<string[]>;
  /**
   * Every kept date at once, as "MM-DD" to the keeper's name.
   *
   * One call rather than 366. The keepers calendar needs the whole year before
   * it can draw a single cell, and asking `keepersFor` per date would be 366
   * round trips to render one screen.
   *
   * Dates with no keeper are simply absent, so the map is small — at most 366
   * short strings, and far fewer until the seats sell. An empty map is a valid
   * answer and means nothing is kept yet; a failure returns one too, because a
   * calendar that cannot reach the archive should read as "none known" rather
   * than refuse to draw.
   */
  keptDates(): Promise<Record<string, string>>;
  /**
   * True for the device-local stand-in. The UI says so out loud: a seat number
   * that is not globally allocated must never be presented as if it were.
   */
  readonly isLocal: boolean;
}
