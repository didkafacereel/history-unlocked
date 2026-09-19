import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Events this reader marked as worth keeping.
 *
 * Distinct from {@link useLibraryStore}, which records what was READ. Read is
 * something the app observed; kept is something the reader decided. Only the
 * second can carry their name on an album, and conflating the two would put
 * eight thousand events in it.
 *
 * Free for everyone, deliberately. Marking things you liked is the cheapest
 * reason to come back and the only way the album ever fills; gating the gesture
 * would mean the perk it feeds arrives empty on the day someone pays for it.
 *
 * Device-local, like the library. Carrying it between phones is the same
 * backend job as the founder seats and the votes, not a separate one.
 */

function epochDay(now: Date = new Date()): number {
  return Math.floor(now.getTime() / 86_400_000);
}

interface FavouritesState {
  /** event id → epoch-day it was kept. */
  kept: Record<string, number>;

  toggle: (eventId: string) => void;
  /** Destructive — only from an explicit user action. */
  clearFavourites: () => void;
}

export const useFavouritesStore = create<FavouritesState>()(
  persist(
    (set, get) => ({
      kept: {},

      toggle: (eventId) => {
        const { kept } = get();
        if (kept[eventId] !== undefined) {
          const next = { ...kept };
          delete next[eventId];
          set({ kept: next });
          return;
        }
        set({ kept: { ...kept, [eventId]: epochDay() } });
      },

      clearFavourites: () => set({ kept: {} }),
    }),
    {
      name: 'history-unlocked.favourites.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * Whether ONE event is kept.
 *
 * A boolean, not the map: a card subscribed to the whole map would re-render
 * every card in the deck each time any event is kept, during a swipe.
 */
export const useIsKept = (eventId: string) =>
  useFavouritesStore((s) => s.kept[eventId] !== undefined);

export const useKeptCount = () => useFavouritesStore((s) => Object.keys(s.kept).length);

/**
 * Kept event ids, most recently kept first.
 *
 * Takes the MAP, not the store state, so it cannot be passed to
 * `useFavouritesStore(...)` as a selector. It was, once, and the album route
 * rendered until React gave up with "Maximum update depth exceeded": the
 * function returns a fresh array every call, zustand compares selector results
 * with `Object.is`, and so every render looked like a state change. Derive it
 * with `useMemo` over `s.kept`, which is a stable reference.
 */
export function keptIdsNewestFirst(kept: Record<string, number>): string[] {
  return Object.entries(kept)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
}
