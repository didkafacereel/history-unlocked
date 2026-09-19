import { EventCategory, HistoricalEvent } from '@/types/manifest';
import { hasAuthoredQuiz } from './quizGeneration';

/**
 * Turns a day's full event list into the deck the feed actually renders.
 *
 * Two product rules live here, and only here:
 *
 *  1. DEPTH. The archive carries ~10 events for every calendar day. Free
 *     readers get the strongest {@link FREE_DEPTH}; Pro gets the whole day.
 *     The free selection is DETERMINISTIC — the same three all day, every day,
 *     so the locked remainder is an honest wall rather than a slot machine.
 *
 *  2. MEMORY. The date model is "MM-DD", so the same day next year would serve
 *     an identical deck. Instead the reader lands on their first unread event
 *     and read cards are marked. Read-state never reorders anything — only the
 *     entry point moves.
 *
 *  3. THE LEAD. One event per day is pinned to the front. Measured over the
 *     whole archive, sorting strictly by year buried the day's strongest event
 *     outside the first three cards on 80% of days — on average it sat sixth of
 *     ten. A reader who swiped twice and left had missed the best thing there.
 *     So the deck is a front page: the lead, then the day in time order.
 *
 * Pure and synchronous — no store, no React — so the rules can be reasoned
 * about (and tested) without mounting the feed.
 */

/** Events a free reader gets per day before the depth wall. */
export const FREE_DEPTH = 3;

export interface DeckPlan {
  /** What the feed renders: the lead, then the rest in year order. */
  events: HistoricalEvent[];
  /** Events on this day withheld behind Pro. Zero for Pro readers. */
  lockedCount: number;
  /** Ids within `events` the reader has never opened. */
  unseenIds: ReadonlySet<string>;
  /** Index of the first unread card — where the deck opens. */
  startIndex: number;
  /** The event pinned at index 0. Null only when the day is empty. */
  heroId: string | null;
  /** How many events the WHOLE day holds per category — drives the filter UI. */
  categoryCounts: Partial<Record<EventCategory, number>>;
}

/**
 * How strong an event is as the one card a newcomer might see today.
 *
 * A cornerstone outranks everything, by a margin nothing else can close: these
 * are the handful of dates the world already knows the date FOR, and if 11
 * September does not open on the attacks the app has failed at its own premise.
 * Then the readers' choice, which is why voting is worth casting. Then
 * authored events (the ones carrying a scenario quiz) —
 * they are written in our voice and are the app at its best — then density:
 * more facts, a real place, a longer article behind the "read more" sheet.
 *
 * Exported because the quiz-authoring pipeline picks which events to write for
 * by this exact ranking. Two scoring functions would drift, and the drift would
 * show up as money spent authoring scenarios for cards nobody is served.
 */
export function prominence(event: HistoricalEvent): number {
  return (
    (event.cornerstone ? 100 : 0) +
    // Readers' choice outranks an authored quiz and any amount of density, so
    // on an ordinary day the crowd's pick does lead. It comes nowhere near a
    // cornerstone, deliberately: no number of votes moves the attacks off 11
    // September, and the gap is 92 points wide so no future weighting closes it
    // by accident.
    (event.readersChoice ? 8 : 0) +
    (hasAuthoredQuiz(event) ? 6 : 0) +
    (event.tactical ? 3 : 0) +
    Math.min(event.facts.length, 4) +
    (event.coordinates ? 1 : 0) +
    Math.min((event.summary?.length ?? 0) / 1200, 2)
  );
}

function countByCategory(events: readonly HistoricalEvent[]): Partial<Record<EventCategory, number>> {
  const counts: Partial<Record<EventCategory, number>> = {};
  for (const event of events) {
    if (event.category) {
      counts[event.category] = (counts[event.category] ?? 0) + 1;
    }
  }
  return counts;
}

const byYear = (a: HistoricalEvent, b: HistoricalEvent) => a.year - b.year;

/** Strongest first; id breaks ties so the same day always leads the same way. */
const byStrength = (a: HistoricalEvent, b: HistoricalEvent) => {
  const delta = prominence(b) - prominence(a);
  return delta !== 0 ? delta : a.id.localeCompare(b.id);
};

export interface PlanDeckOptions {
  isPro: boolean;
  /** The library map: event id → epoch-day first read. */
  seen: Readonly<Record<string, number>>;
  /**
   * Show only this category. A Pro control: with three events a day there is
   * nothing to filter, and the filter only becomes useful at the depth Pro buys.
   * A filter that empties the day is ignored rather than obeyed — an empty feed
   * is a worse answer than an unfiltered one.
   */
  category?: EventCategory | null;
}

export function planDeck(
  all: readonly HistoricalEvent[],
  { isPro, seen, category = null }: PlanDeckOptions,
): DeckPlan {
  const everything = all.slice().sort(byYear);
  const narrowed = category ? everything.filter((e) => e.category === category) : everything;
  const chronological = narrowed.length > 0 ? narrowed : everything;
  const ranked = chronological.slice().sort(byStrength);

  // Free readers get the strongest few. The lead is rank 0, so it is always
  // among them — a free day is never led by its second-best event.
  const selected =
    !isPro && ranked.length > FREE_DEPTH ? ranked.slice(0, FREE_DEPTH) : chronological;

  const hero = ranked[0] ?? null;
  const rest = selected.filter((e) => e.id !== hero?.id).sort(byYear);
  const events = hero ? [hero, ...rest] : rest;

  const unseenIds = new Set(events.filter((e) => seen[e.id] === undefined).map((e) => e.id));
  const firstUnseen = events.findIndex((e) => unseenIds.has(e.id));

  return {
    events,
    lockedCount: chronological.length - events.length,
    categoryCounts: countByCategory(everything),
    unseenIds,
    // Every card read already: open on the lead rather than at a phantom index.
    startIndex: firstUnseen === -1 ? 0 : firstUnseen,
    heroId: hero?.id ?? null,
  };
}
