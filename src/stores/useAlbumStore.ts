import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * The founder's album: a handful of events, chosen by hand, under their name.
 *
 * Separate from {@link useFavouritesStore} on purpose, and the separation IS
 * the feature. Keeping an event is cheap and a reader may keep hundreds; the
 * album asks them to choose, and a list of ten things you chose out of two
 * hundred says something a list of two hundred cannot.
 *
 * The cap is what makes it worth having. An uncapped album is a bookmark
 * folder — nobody reads someone else's bookmark folder, and nobody would show
 * one to a friend.
 */

/** Below this it is not a collection yet, and the app does not present it as one. */
export const ALBUM_MIN = 3;
/** Above this it stops being a choice. */
export const ALBUM_MAX = 10;

interface AlbumState {
  /** Event ids in the order the founder placed them. */
  eventIds: string[];

  /** Adds if there is room; a full album ignores the call rather than evicting. */
  add: (eventId: string) => void;
  remove: (eventId: string) => void;
  /** Move an entry one place towards the front. */
  promote: (eventId: string) => void;
  clearAlbum: () => void;
}

export const useAlbumStore = create<AlbumState>()(
  persist(
    (set, get) => ({
      eventIds: [],

      add: (eventId) => {
        const { eventIds } = get();
        if (eventIds.includes(eventId) || eventIds.length >= ALBUM_MAX) {
          return;
        }
        set({ eventIds: [...eventIds, eventId] });
      },

      remove: (eventId) => {
        set({ eventIds: get().eventIds.filter((id) => id !== eventId) });
      },

      promote: (eventId) => {
        const { eventIds } = get();
        const index = eventIds.indexOf(eventId);
        if (index <= 0) {
          return;
        }
        const next = eventIds.slice();
        const above = next[index - 1];
        const self = next[index];
        if (above === undefined || self === undefined) {
          return;
        }
        next[index - 1] = self;
        next[index] = above;
        set({ eventIds: next });
      },

      clearAlbum: () => set({ eventIds: [] }),
    }),
    {
      name: 'history-unlocked.album.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** One boolean, so a long list of kept events does not re-render as a whole. */
export const useIsInAlbum = (eventId: string) =>
  useAlbumStore((s) => s.eventIds.includes(eventId));

export const useAlbumCount = () => useAlbumStore((s) => s.eventIds.length);
