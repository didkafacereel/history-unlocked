/**
 * Milestones inside a collection, because completion is out of reach.
 *
 * Measured, not assumed: the Museum's largest set holds 1048 cards and several
 * others run past 400. A reader who opens twenty events a day would need weeks
 * on one set, and the honest consequence is that nobody starts — a bar showing
 * 4 of 1048 is not encouragement, it is a statement that this is not for you.
 *
 * Tiers turn one unreachable target into four reachable ones. The set still
 * shows its true size; what changes is that the NEXT thing is always close.
 *
 * Thresholds are absolute rather than percentages on purpose. Ten cards is ten
 * cards of reading whether the set holds 71 or 1048, and a percentage would
 * make the big sets exactly as hopeless as they are now.
 */

export interface CollectionTier {
  /** Cards required. */
  at: number;
  name: string;
  glyph: string;
}

export const COLLECTION_TIERS: readonly CollectionTier[] = [
  { at: 10, name: 'Bronze', glyph: '◆' },
  { at: 50, name: 'Silver', glyph: '◆◆' },
  { at: 150, name: 'Gold', glyph: '◆◆◆' },
] as const;

export interface TierStanding {
  /** The highest tier reached, or null before the first. */
  reached: CollectionTier | null;
  /** The next tier, or null when the set is finished or every tier is passed. */
  next: CollectionTier | null;
  /** Cards still needed for `next`. Zero when there is no next. */
  remaining: number;
  /** True when every card in the set has been read. */
  complete: boolean;
}

/**
 * Where a reader stands in one set.
 *
 * A tier beyond the set's own size is skipped: offering "Silver at 50" for a
 * set of 22 would be a target the archive cannot supply, which is the same
 * defect as the one tiers exist to fix.
 */
export function tierStanding(read: number, total: number): TierStanding {
  const attainable = COLLECTION_TIERS.filter((tier) => tier.at <= total);
  let reached: CollectionTier | null = null;
  let next: CollectionTier | null = null;

  for (const tier of attainable) {
    if (read >= tier.at) {
      reached = tier;
    } else if (next === null) {
      next = tier;
    }
  }

  const complete = total > 0 && read >= total;
  // Past the last tier but not finished: the set itself becomes the target, so
  // the reader is never told they have nothing left to aim at.
  if (next === null && !complete && total > 0) {
    return { reached, next: null, remaining: total - read, complete: false };
  }

  return {
    reached,
    next,
    remaining: next ? next.at - read : 0,
    complete,
  };
}
