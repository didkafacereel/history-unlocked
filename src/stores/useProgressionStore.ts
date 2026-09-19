import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { daysBetweenIsoDates, isoDateKey, previousIsoDateKey } from '@/lib/dateKey';

/**
 * Persisted progression: XP, streak, streak freezes, completion history. Rank
 * is always DERIVED from XP via types/progression.ts — never stored — so ladder
 * rebalances need no migration.
 *
 * Same micro-matching rule as every store: subscribe to single fields.
 * StreakFlame reads streakCount, RankProgressBar reads xp, nothing overlaps.
 */

const HISTORY_CAP = 60;

/** Pro perk: streak shield. Refilled to MAX at most once per window. */
const PRO_FREEZE_MAX = 2;
const FREEZE_REFILL_DAYS = 7;

/**
 * Free readers get ONE shield a month.
 *
 * Not charity, and not a weakening of the Pro perk. A reader whose 40-day
 * streak dies to a single missed Tuesday usually does not start a new one —
 * the loss is the moment they leave. Giving them one save keeps them, and it
 * teaches the perk by letting them feel it work; the Pro difference (two, and
 * refilled weekly instead of monthly) is a difference in degree, which is a
 * far easier sell than a mechanic they have never experienced.
 */
const FREE_FREEZE_MAX = 1;
const FREE_FREEZE_REFILL_DAYS = 30;

interface ProgressionState {
  xp: number;
  streakCount: number;
  /** "YYYY-MM-DD" of the last day a quiz was completed, or null. */
  lastCompletedDate: string | null;
  /** Most-recent-last list of completed days, capped at HISTORY_CAP. */
  completedDates: string[];
  /** Available streak shields (Pro perk). Free users stay at 0. */
  streakFreezes: number;
  /** Days a freeze bridged, shown as ❄️ in the calendar strip. */
  frozenDates: string[];
  /** Last day Pro freezes were topped up — gates the weekly refill. */
  lastFreezeGrant: string | null;

  /** Award XP and advance the streak (streak counts once per local day). */
  recordQuizResult: (xpGained: number) => void;
  /** Top the reader back up to their tier's shield count, once per window. */
  refreshProFreezes: (isPro: boolean) => void;
}

export const useProgressionStore = create<ProgressionState>()(
  persist(
    (set, get) => ({
      xp: 0,
      streakCount: 0,
      lastCompletedDate: null,
      completedDates: [],
      streakFreezes: 0,
      frozenDates: [],
      lastFreezeGrant: null,

      recordQuizResult: (xpGained) => {
        const { xp, streakCount, lastCompletedDate, completedDates, streakFreezes, frozenDates } =
          get();
        const today = isoDateKey();

        if (lastCompletedDate === today) {
          // Replaying the same day: XP accrues, the streak does not.
          set({ xp: xp + xpGained });
          return;
        }

        let nextStreak = 1;
        let freezesUsed = 0;
        let nextFrozen = frozenDates;

        if (lastCompletedDate !== null) {
          const gap = daysBetweenIsoDates(lastCompletedDate, today);
          if (gap === 1) {
            // Completed yesterday — clean continuation.
            nextStreak = streakCount + 1;
          } else {
            // Missed one or more days: a Pro streak shield can bridge the gap
            // (one freeze per missed day) instead of resetting to 1.
            const missed = gap - 1;
            if (missed > 0 && streakFreezes >= missed) {
              freezesUsed = missed;
              nextStreak = streakCount + 1;
              const bridged: string[] = [];
              let cursor = today;
              for (let i = 0; i < missed; i++) {
                cursor = previousIsoDateKey(cursor);
                bridged.push(cursor);
              }
              nextFrozen = [...frozenDates, ...bridged].slice(-HISTORY_CAP);
            }
          }
        }

        set({
          xp: xp + xpGained,
          streakCount: nextStreak,
          lastCompletedDate: today,
          completedDates: [...completedDates, today].slice(-HISTORY_CAP),
          streakFreezes: streakFreezes - freezesUsed,
          frozenDates: nextFrozen,
        });
      },

      refreshProFreezes: (isPro) => {
        const max = isPro ? PRO_FREEZE_MAX : FREE_FREEZE_MAX;
        const window = isPro ? FREEZE_REFILL_DAYS : FREE_FREEZE_REFILL_DAYS;

        const { lastFreezeGrant, streakFreezes } = get();
        const today = isoDateKey();
        if (lastFreezeGrant && daysBetweenIsoDates(lastFreezeGrant, today) < window) {
          return;
        }
        // `max`, never a top-up beyond it: a reader who downgrades keeps the
        // shields they already hold but stops accruing at the Pro rate.
        set({ streakFreezes: Math.max(streakFreezes, max), lastFreezeGrant: today });
      },
    }),
    {
      name: 'history-unlocked.progression.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Selector helper: has today's quiz already been completed? */
export function selectTodayCompleted(state: ProgressionState): boolean {
  return state.lastCompletedDate === isoDateKey();
}
