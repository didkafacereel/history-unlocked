import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Which questions this reader has already answered.
 *
 * The archive repeats by design — a calendar of history comes round again every
 * year, and {@link useRecallStore} deliberately schedules those returns. What
 * must NOT repeat is the question itself. Being asked the identical question
 * with the identical four choices reads as the app having run out of material,
 * and it teaches nothing the second time: the reader recognises the answer's
 * shape rather than recalling the history. So the draw prefers questions this
 * reader has never seen, and falls back to the longest-unseen only once the
 * event's whole pool is spent.
 *
 * KEPT PER ACCOUNT. Signing in is what makes this survive a new phone, and it
 * is also what keeps two people sharing one tablet out of each other's history.
 * Every bucket lives in ONE persisted blob keyed by account rather than in a
 * store whose storage name changes: a store that re-points its own key has a
 * window during which a write lands in the previous account's bucket, and the
 * failure is silent and unrecoverable. Question ids are short; the blob is cheap.
 *
 * NOT yet synced to a server — there is no backend. Signing in scopes the
 * history and merges what the device already knew; carrying it BETWEEN devices
 * needs the same service the founder seats and the votes are waiting on.
 */

/** The signed-out reader's bucket. Never collides: real keys carry "acct:". */
const DEVICE_BUCKET = 'device';

function bucketFor(accountId: string | null): string {
  return accountId ? `acct:${accountId}` : DEVICE_BUCKET;
}

function epochDay(now: Date = new Date()): number {
  return Math.floor(now.getTime() / 86_400_000);
}

/** questionId → epoch-day it was last answered. */
type SeenMap = Record<string, number>;

interface QuizHistoryState {
  /** bucket key → that reader's answered questions. */
  buckets: Record<string, SeenMap>;
  /** Whose history the draw should currently use. */
  accountId: string | null;
  /**
   * False until AsyncStorage has been read. The draw does not wait on it — a
   * quiz opened in that window simply filters nothing, which serves one
   * repeated question rather than blocking the screen on storage.
   */
  hydrated: boolean;

  /** Called once per answered question, from the quiz's grading transition. */
  markAnswered: (questionId: string) => void;
  /**
   * Point the history at an account (or back at the device on sign-out).
   * Signing in MERGES the device's history in: those questions were answered by
   * the person now signing in, and showing them again would be the exact defect
   * this store exists to prevent.
   */
  switchAccount: (accountId: string | null) => void;
  /** Forget this reader's history. Destructive — explicit user action only. */
  clearHistory: () => void;
  /** Set once, by the persist middleware, when storage has been read. */
  setHydrated: () => void;
}

export const useQuizHistoryStore = create<QuizHistoryState>()(
  persist(
    (set, get) => ({
      buckets: {},
      accountId: null,
      hydrated: false,

      markAnswered: (questionId) => {
        const { buckets, accountId } = get();
        const key = bucketFor(accountId);
        set({
          buckets: {
            ...buckets,
            [key]: { ...(buckets[key] ?? {}), [questionId]: epochDay() },
          },
        });
      },

      switchAccount: (accountId) => {
        const { buckets, accountId: previous } = get();
        if (previous === accountId) {
          return;
        }
        if (accountId === null) {
          set({ accountId: null });
          return;
        }

        const key = bucketFor(accountId);
        const device = buckets[DEVICE_BUCKET];
        if (!device) {
          set({ accountId });
          return;
        }

        // Union, keeping the later sighting of any question both buckets know.
        const merged: SeenMap = { ...(buckets[key] ?? {}) };
        for (const [questionId, day] of Object.entries(device)) {
          merged[questionId] = Math.max(merged[questionId] ?? 0, day);
        }
        // The device bucket is kept, not moved: signing out must not hand the
        // next reader of this phone a history that says everything is answered.
        set({ accountId, buckets: { ...buckets, [key]: merged } });
      },

      clearHistory: () => {
        const { buckets, accountId } = get();
        const next = { ...buckets };
        delete next[bucketFor(accountId)];
        set({ buckets: next });
      },

      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'history-unlocked.quiz-history.v1',
      storage: createJSONStorage(() => AsyncStorage),
      // The signed-in account is authoritative on the auth service, not here;
      // persisting it would let a stale id outlive a sign-out.
      partialize: (s) => ({ buckets: s.buckets }),
      /**
       * Union, not replace.
       *
       * Rehydration lands whenever storage answers, and the default behaviour
       * overwrites whatever is in memory by then. A reader who opens the app
       * and answers a question before that moment would have the answer erased
       * by their own saved history — rare, silent, and unrecoverable. Merging
       * bucket by bucket means an early write survives, and the later sighting
       * of any question wins.
       */
      merge: (persisted, current) => {
        const saved = (persisted as { buckets?: Record<string, SeenMap> } | undefined)?.buckets;
        if (!saved) {
          return current;
        }
        const buckets: Record<string, SeenMap> = { ...saved };
        for (const [key, seen] of Object.entries(current.buckets)) {
          const combined: SeenMap = { ...(buckets[key] ?? {}) };
          for (const [questionId, day] of Object.entries(seen)) {
            combined[questionId] = Math.max(combined[questionId] ?? 0, day);
          }
          buckets[key] = combined;
        }
        return { ...current, buckets };
      },
      // Runs after storage resolves, so the draw can tell "nothing answered"
      // from "not read yet" and decline to filter on an empty map.
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

/**
 * Epoch-day this reader answered `questionId`, or null if never.
 *
 * Read imperatively from the draw rather than through a hook: the draw runs
 * once per quiz, and subscribing the feed to a map that grows on every answer
 * would re-render it for nothing.
 */
export function lastAnswered(questionId: string): number | null {
  const { buckets, accountId, hydrated } = useQuizHistoryStore.getState();
  if (!hydrated) {
    return null;
  }
  return buckets[bucketFor(accountId)]?.[questionId] ?? null;
}

/** How many distinct questions this reader has answered. */
export const useAnsweredCount = () =>
  useQuizHistoryStore((s) => Object.keys(s.buckets[bucketFor(s.accountId)] ?? {}).length);
