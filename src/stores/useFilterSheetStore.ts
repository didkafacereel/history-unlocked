import { create } from 'zustand';

/**
 * Whether the category filter sheet is open.
 *
 * A store rather than local state in the date bar, for the same reason the
 * tactical and read-more sheets have one: an overlay has to render as a SIBLING
 * of the feed deck, not inside it. Inside, two things go wrong — touches on the
 * sheet also drive the deck's pan gesture, and the deck remounts (it is keyed on
 * its measured height, and the screen on `deckToken`), which silently throws the
 * open sheet away. Keeping the flag out here lets the sheet live where every
 * other overlay lives while the chip that opens it stays in the date bar.
 */
interface FilterSheetState {
  open: boolean;
  openSheet: () => void;
  closeSheet: () => void;
}

export const useFilterSheetStore = create<FilterSheetState>()((set) => ({
  open: false,
  openSheet: () => set({ open: true }),
  closeSheet: () => set({ open: false }),
}));
