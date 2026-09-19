import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Era } from '@/types/manifest';

/**
 * How well this reader knows each era.
 *
 * Every other score in the app is momentary — the debrief says 2/3 and then
 * forgets it. That is fine for a daily habit and useless for the thing the
 * archive is actually for: a reader spends a year answering questions and has
 * nothing at the end of it that says what they learned.
 *
 * Six counters answer that. They also give the endless simulations a reason to
 * exist beyond passing time: a run through Medieval that moves 41% to 58% is a
 * result, where "you scored 6/10" is a receipt.
 *
 * Deliberately raw counts rather than a rolling accuracy. A percentage cannot
 * be rebalanced later, and it hides the difference between 2/3 and 200/300 —
 * which is the difference between a guess and a fact about the reader.
 *
 * Counted from EVERY answer, including practice. Practice is excluded from XP
 * and the streak because those are daily commitments that a replay would
 * debase; knowing an era is not a daily commitment, and an answer given in
 * practice is exactly as much evidence as one given in the daily quiz.
 */

export interface EraTally {
  seen: number;
  correct: number;
}

interface EraAccuracyState {
  tallies: Partial<Record<Era, EraTally>>;

  record: (era: Era, correct: boolean) => void;
  /** Destructive — only from an explicit user action. */
  resetAccuracy: () => void;
}

export const useEraAccuracyStore = create<EraAccuracyState>()(
  persist(
    (set, get) => ({
      tallies: {},

      record: (era, correct) => {
        const { tallies } = get();
        const previous = tallies[era] ?? { seen: 0, correct: 0 };
        set({
          tallies: {
            ...tallies,
            [era]: {
              seen: previous.seen + 1,
              correct: previous.correct + (correct ? 1 : 0),
            },
          },
        });
      },

      resetAccuracy: () => set({ tallies: {} }),
    }),
    {
      name: 'history-unlocked.era-accuracy.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * Below this an accuracy figure is noise, and showing it invites the reader to
 * conclude something about themselves from three answers.
 */
export const MIN_ANSWERS_FOR_ACCURACY = 5;

/** 0-1, or null when too few answers to mean anything. */
export function accuracyOf(tally: EraTally | undefined): number | null {
  if (!tally || tally.seen < MIN_ANSWERS_FOR_ACCURACY) {
    return null;
  }
  return tally.correct / tally.seen;
}

/** Total answers recorded across every era. */
export const useTotalAnswered = () =>
  useEraAccuracyStore((s) =>
    Object.values(s.tallies).reduce((sum, tally) => sum + tally.seen, 0),
  );
