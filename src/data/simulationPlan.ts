import { Era, EventCategory, HistoricalEvent } from '@/types/manifest';
import { hasAuthoredQuiz } from './quizGeneration';

/**
 * Which slice of the archive a practice run draws from, and how it picks.
 *
 * The archive holds six thousand written scenarios and the app served three a
 * day. That is the whole reason this exists: at three a day a reader would need
 * five years to see what is already sitting in the manifest. Simulations open
 * the rest of it — pick an era or a category and run as long as you like.
 *
 * Pure and synchronous, like `deckPlan` — the rules can be reasoned about
 * without loading a manifest or mounting a screen.
 */

export type SimulationScope =
  | { kind: 'all' }
  | { kind: 'era'; era: Era }
  | { kind: 'category'; category: EventCategory };

export const ALL_SCOPE: SimulationScope = { kind: 'all' };

/** Events per round. Long enough to feel like a session, short enough to end. */
export const ROUND_SIZE = 10;

export function scopeLabel(scope: SimulationScope): string {
  switch (scope.kind) {
    case 'era':
      return scope.era;
    case 'category':
      return scope.category;
    default:
      return 'The whole archive';
  }
}

/** Stable identity for a scope — used as a React key and a store comparison. */
export function scopeKey(scope: SimulationScope): string {
  switch (scope.kind) {
    case 'era':
      return `era:${scope.era}`;
    case 'category':
      return `category:${scope.category}`;
    default:
      return 'all';
  }
}

export function matchesScope(event: HistoricalEvent, scope: SimulationScope): boolean {
  switch (scope.kind) {
    case 'era':
      return event.era === scope.era;
    case 'category':
      return event.category === scope.category;
    default:
      return true;
  }
}

/** How many events each scope can offer — drives the counts on the picker. */
export function scopeCounts(all: readonly HistoricalEvent[]): {
  eras: Partial<Record<Era, number>>;
  categories: Partial<Record<EventCategory, number>>;
  total: number;
} {
  const eras: Partial<Record<Era, number>> = {};
  const categories: Partial<Record<EventCategory, number>> = {};
  for (const event of all) {
    eras[event.era] = (eras[event.era] ?? 0) + 1;
    if (event.category) {
      categories[event.category] = (categories[event.category] ?? 0) + 1;
    }
  }
  return { eras, categories, total: all.length };
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

/**
 * The events for one round.
 *
 * Authored scenarios come first, and that is the point of the ranking rather
 * than a nicety: a written scenario asks the reader to judge, while a generated
 * question asks them to recall a year. Only the first is what the archive was
 * paid to be, so a round spends its ten slots on those wherever they exist and
 * falls through to generated questions only when a narrow scope runs out.
 *
 * Shuffled, unlike the daily quiz. The daily quiz is deterministic so it cannot
 * be rerolled; a practice run is chosen deliberately and repeatedly, and serving
 * the same ten events every time would make the archive feel ten deep.
 *
 * `random` is injected so the selection can be exercised with a fixed sequence.
 */
export function pickRound(
  all: readonly HistoricalEvent[],
  scope: SimulationScope,
  size = ROUND_SIZE,
  random: () => number = Math.random,
): HistoricalEvent[] {
  const inScope = all.filter((e) => matchesScope(e, scope));
  const authored = shuffle(
    inScope.filter((e) => hasAuthoredQuiz(e)),
    random,
  );
  if (authored.length >= size) {
    return authored.slice(0, size);
  }
  const generated = shuffle(
    inScope.filter((e) => !hasAuthoredQuiz(e)),
    random,
  );
  return [...authored, ...generated].slice(0, size);
}
