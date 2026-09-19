import { create } from 'zustand';

import { PersonEntry } from '@/types/manifest';

/**
 * Which person from the day's register is open.
 *
 * A store, and the sheet renders beside the feed deck rather than inside the
 * register card — the same rule the category filter had to be moved to obey.
 * Anything inside the deck lives in a subtree that remounts on a layout change
 * and sits under the swipe gesture; an overlay can afford neither.
 */
interface PersonDetailState {
  person: PersonEntry | null;
  open: (person: PersonEntry) => void;
  close: () => void;
}

export const usePersonDetailStore = create<PersonDetailState>()((set) => ({
  person: null,
  open: (person) => set({ person }),
  close: () => set({ person: null }),
}));
