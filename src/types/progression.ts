/**
 * Intel Rank ladder and XP arithmetic. Pure data + pure functions — the
 * progression store persists raw XP and derives everything else from here,
 * so rebalancing the ladder never requires a storage migration.
 */

export interface IntelRank {
  name: string;
  glyph: string;
  minXp: number;
}

/** Ascending by minXp — rank lookups depend on this ordering. */
export const INTEL_RANKS: readonly IntelRank[] = [
  { name: 'Recruit', glyph: '▲', minXp: 0 },
  { name: 'Analyst', glyph: '◆', minXp: 100 },
  { name: 'Operative', glyph: '✦', minXp: 250 },
  { name: 'Field Agent', glyph: '★', minXp: 500 },
  { name: 'Spymaster', glyph: '☼', minXp: 1000 },
  { name: 'Grandmaster', glyph: '✹', minXp: 2000 },
] as const;

const BASE_RANK: IntelRank = { name: 'Recruit', glyph: '▲', minXp: 0 };

export function rankForXp(xp: number): IntelRank {
  let current = BASE_RANK;
  for (const rank of INTEL_RANKS) {
    if (xp >= rank.minXp) {
      current = rank;
    }
  }
  return current;
}

/** The next rank above `xp`, or null at the top of the ladder. */
export function nextRankFor(xp: number): IntelRank | null {
  for (const rank of INTEL_RANKS) {
    if (xp < rank.minXp) {
      return rank;
    }
  }
  return null;
}

/** 0..1 progress from the current rank's floor toward the next rank. */
export function rankProgress(xp: number): number {
  const current = rankForXp(xp);
  const next = nextRankFor(xp);
  if (!next) {
    return 1;
  }
  return (xp - current.minXp) / (next.minXp - current.minXp);
}

/**
 * Rescaled when the daily quiz went from three questions to eight (sixteen for
 * Pro). At 25 a perfect free day would have paid 225 instead of 100, and
 * Grandmaster — the top of a ladder that ends at 2000 — would have arrived in
 * nine days rather than twenty.
 *
 * The award was lowered rather than the ladder raised, deliberately. XP is
 * persisted raw and every rank is derived from it, so raising `minXp` would
 * demote readers who had already earned their badge. Lowering what future
 * answers pay takes nothing off anyone.
 *
 * A perfect free day is 8 x 10 + 20 = 100, exactly what it paid before. Pro's
 * sixteen pay 180, which is the point of the longer quiz.
 */
export const XP_PER_CORRECT = 10;
export const XP_PERFECT_BONUS = 20;

export function awardForQuiz(correct: number, total: number): number {
  const perfect = total > 0 && correct === total ? XP_PERFECT_BONUS : 0;
  return correct * XP_PER_CORRECT + perfect;
}
