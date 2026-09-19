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
 * Generations avoid both. The first 500 seats are gone forever once they are
 * gone — nobody can become first-generation later, which is the whole point —
 * and the line simply moves on to the next band at a higher price.
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
export const FOUNDER_GENERATIONS: FounderGeneration[] = [
  { ordinal: 1, numeral: 'I', name: 'First Generation', firstSeat: 1, lastSeat: 500, price: '$79.99' },
  { ordinal: 2, numeral: 'II', name: 'Second Generation', firstSeat: 501, lastSeat: 1000, price: '$119.99' },
  { ordinal: 3, numeral: 'III', name: 'Third Generation', firstSeat: 1001, lastSeat: 1500, price: '$159.99' },
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
 * How many founders may keep the same date.
 *
 * Three, not one. A single keeper per day makes 366 the hard ceiling on
 * lifetime sales and turns birthdays into a land grab — the first hundred
 * buyers would take every date anyone actually wants. Three keeps the
 * good dates reachable for longer while the line still reads as a short list
 * of names rather than a crowd.
 */
export const KEEPERS_PER_DATE = 3;

/**
 * Total day-keeping places: 366 dates times {@link KEEPERS_PER_DATE}. A
 * different ceiling from the seat count, and the honest reason a late founder
 * may find no day left — there are only so many days.
 */
export const KEEPER_PLACES = 366 * 3;

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
   * True for the device-local stand-in. The UI says so out loud: a seat number
   * that is not globally allocated must never be presented as if it were.
   */
  readonly isLocal: boolean;
}
