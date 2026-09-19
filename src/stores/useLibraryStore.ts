import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * The reading library: which events this user has already read.
 *
 * This is what makes "your archive" a real thing rather than a rerun. The date
 * model is "MM-DD", so without a memory the feed would serve an identical deck
 * on the same day next year. With it, a returning reader is dropped straight
 * onto the first event they have never seen, and cards they have read are
 * marked. The archive currently holds ~10 events per day, so a reader who takes
 * three a day has roughly three years before the well runs dry.
 *
 * Same micro-matching rule as every store: subscribe to one datum. The feed
 * reads this store exactly ONCE per deck load (through `planDeck`) and writes
 * to it once per card settle — never during a gesture.
 */

/**
 * Days are stored as whole epoch-days rather than milliseconds: the map is
 * persisted in full on every write, and `20340` costs a fifth of a timestamp.
 */
function epochDay(now: Date = new Date()): number {
  return Math.floor(now.getTime() / 86_400_000);
}

/**
 * Ceiling on remembered events. The archive is ~3.8k events today and grows by
 * a few hundred a year, so this is not a limit a reader can reach — it is a
 * guard so a corrupted or ballooning map can never make startup storage I/O
 * expensive. Oldest reads are dropped first.
 */
const LIBRARY_CAP = 20_000;

interface LibraryState {
  /** event id → epoch-day it was first read. */
  seen: Record<string, number>;

  /** Record a card as read. Idempotent: the FIRST read date is kept. */
  markSeen: (eventId: string) => void;
  /** Record several at once (deck load marks the landing card). */
  markManySeen: (eventIds: readonly string[]) => void;
  /** Wipe the library — offered in the profile, since it is destructive. */
  resetLibrary: () => void;
}

function prune(seen: Record<string, number>): Record<string, number> {
  const entries = Object.entries(seen);
  if (entries.length <= LIBRARY_CAP) {
    return seen;
  }
  entries.sort((a, b) => a[1] - b[1]);
  return Object.fromEntries(entries.slice(entries.length - LIBRARY_CAP));
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      seen: {},

      markSeen: (eventId) => {
        const { seen } = get();
        if (seen[eventId] !== undefined) {
          return;
        }
        set({ seen: prune({ ...seen, [eventId]: epochDay() }) });
      },

      markManySeen: (eventIds) => {
        const { seen } = get();
        const fresh = eventIds.filter((id) => seen[id] === undefined);
        if (fresh.length === 0) {
          return;
        }
        const today = epochDay();
        const next = { ...seen };
        for (const id of fresh) {
          next[id] = today;
        }
        set({ seen: prune(next) });
      },

      resetLibrary: () => set({ seen: {} }),
    }),
    {
      name: 'history-unlocked.library.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * Resolves once the persisted library is in memory.
 *
 * The deck plan reads `seen` synchronously to decide where the feed opens, and
 * AsyncStorage hydration is asynchronous — so without this a cold start would
 * plan against an empty library and drop every returning reader back on card
 * one. Cheap to await: already-hydrated is the common case.
 */
export async function whenLibraryReady(): Promise<void> {
  if (useLibraryStore.persist.hasHydrated()) {
    return;
  }
  await new Promise<void>((resolve) => {
    const unsubscribe = useLibraryStore.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

/** How many distinct events this reader has opened, ever. */
export const useEventsReadCount = () =>
  useLibraryStore((s) => Object.keys(s.seen).length);
