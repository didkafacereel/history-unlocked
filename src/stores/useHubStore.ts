import { create } from 'zustand';

/**
 * Whether the reader has gone through the launch screen into the app.
 *
 * This was component state inside the feed route, which was right until the
 * feed grew a way back: the top bar's back button has to put the reader on the
 * hub again, and it sits four components deep inside the deck. Threading a
 * callback down through ChronosFeedScreen and FeedDeck to reach one button is
 * the wrong shape — the same reason the filter sheet keeps its open state here
 * rather than in a prop.
 *
 * DELIBERATELY NOT PERSISTED. The launch screen is a screen per launch, not a
 * screen once ever: the archive has to download and validate on every cold
 * start, and that wait is what the screen exists to fill. A persisted flag
 * would send a returning reader straight to a black screen again.
 */
interface HubState {
  /** False while the reader is on the launch screen. */
  entered: boolean;
  enter: () => void;
  leave: () => void;
}

export const useHubStore = create<HubState>()((set) => ({
  entered: false,
  enter: () => set({ entered: true }),
  leave: () => set({ entered: false }),
}));
