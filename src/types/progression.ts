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

export const XP_PER_CORRECT = 25;
export const XP_PERFECT_BONUS = 25;

export function awardForQuiz(correct: number, total: number): number {
  const perfect = total > 0 && correct === total ? XP_PERFECT_BONUS : 0;
  return correct * XP_PER_CORRECT + perfect;
}
