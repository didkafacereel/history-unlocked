import { create } from 'zustand';

import { type DayFilm, fetchFilms } from '@/data/films';

/**
 * The day's films: the index, and which one is playing.
 *
 * One store per concern (rule 2). The player is a SIBLING of the deck, so
 * whether it is open lives here rather than in the card that opened it — the
 * deck remounts on every card-height change and would take local state with it.
 *
 * Not persisted. The index is a few KB, changes nightly, and a stale copy would
 * only hide tonight's film; the video itself needs the network anyway.
 */

/** Re-read the index at most this often, so a new night's film appears. */
const REFRESH_MS = 30 * 60 * 1000;

interface FilmState {
  /** dateKey → film. Empty until loaded, and when there are none. */
  films: Record<string, DayFilm>;
  loadedAt: number;
  /** The film on screen, or null. */
  playing: DayFilm | null;

  /** Fetch the index unless a recent copy is in hand. Never throws. */
  ensureLoaded: () => Promise<void>;
  play: (film: DayFilm) => void;
  close: () => void;
}

let inflight: Promise<void> | null = null;

export const useFilmStore = create<FilmState>()((set, get) => ({
  films: {},
  loadedAt: 0,
  playing: null,

  ensureLoaded: () => {
    if (Date.now() - get().loadedAt < REFRESH_MS) {
      return Promise.resolve();
    }
    inflight ??= fetchFilms()
      .then((films) => set({ films, loadedAt: Date.now() }))
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },

  play: (film) => set({ playing: film }),
  close: () => set({ playing: null }),
}));

/** The film for one date, or null. A stable reference while the index holds. */
export const useDayFilm = (dateKey: string) => useFilmStore((s) => s.films[dateKey] ?? null);
