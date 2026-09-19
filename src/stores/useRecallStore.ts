import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Spaced repetition over the events this reader has actually been quizzed on.
 *
 * This is the answer to the honest objection to a yearly product: a calendar of
 * history must eventually come round again. Repetition stops being a defect the
 * moment it is SCHEDULED — an event you answered correctly comes back in three
 * days, then a week, then a month, and each return is the reason the reader
 * remembers it a year later instead of having merely scrolled past it.
 *
 * Deliberately a plain interval ladder rather than SM-2: there is no
 * self-graded confidence here, only right or wrong, so the extra machinery of
 * an ease factor would be fitting noise. Same store rules as everywhere —
 * subscribe to one datum, never the whole store.
 */

/** Days until the next review after each consecutive correct answer. */
const LADDER = [1, 3, 7, 16, 35, 75] as const;

function epochDay(now: Date = new Date()): number {
  return Math.floor(now.getTime() / 86_400_000);
}

export interface RecallRecord {
  /** Epoch-day this event becomes reviewable again. */
  due: number;
  /** Consecutive correct answers — the reader's position on the ladder. */
  streak: number;
  /** Times a correct answer was later forgotten. Kept for honesty in stats. */
  lapses: number;
}

interface RecallState {
  records: Record<string, RecallRecord>;

  /** Record the outcome of one question about one event. */
  grade: (eventId: string, correct: boolean) => void;
  /** Clear the schedule. Destructive — only from an explicit user action. */
  resetRecall: () => void;
}

export const useRecallStore = create<RecallState>()(
  persist(
    (set, get) => ({
      records: {},

      grade: (eventId, correct) => {
        const { records } = get();
        const previous = records[eventId];
        const today = epochDay();

        const streak = correct ? Math.min((previous?.streak ?? 0) + 1, LADDER.length) : 0;
        // A wrong answer drops to the bottom rung: tomorrow, from scratch.
        const interval = correct ? (LADDER[streak - 1] ?? LADDER[LADDER.length - 1] ?? 1) : 1;

        set({
          records: {
            ...records,
            [eventId]: {
              due: today + interval,
              streak,
              lapses: (previous?.lapses ?? 0) + (!correct && (previous?.streak ?? 0) > 0 ? 1 : 0),
            },
          },
        });
      },

      resetRecall: () => set({ records: {} }),
    }),
    {
      name: 'history-unlocked.recall.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Event ids whose review has come due, soonest first. */
export function selectDueEventIds(state: RecallState, today = epochDay()): string[] {
  return Object.entries(state.records)
    .filter(([, record]) => record.due <= today)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => id);
}

/** How many events are waiting to be reviewed right now. */
export const useDueCount = () =>
  useRecallStore((s) => {
    const today = epochDay();
    let due = 0;
    for (const record of Object.values(s.records)) {
      if (record.due <= today) {
        due++;
      }
    }
    return due;
  });

/** Events answered correctly at least once and not currently lapsed. */
export const useRetainedCount = () =>
  useRecallStore((s) => Object.values(s.records).filter((r) => r.streak > 0).length);
