import { create } from 'zustand';

import { HistoricalEvent } from '@/types/manifest';

/**
 * Which event's read-more sheet is open. Kept apart from the feed and tactical
 * stores on purpose: opening the reader must not invalidate a single card.
 */
interface EventDetailState {
  event: HistoricalEvent | null;
  open: (event: HistoricalEvent) => void;
  close: () => void;
}

export const useEventDetailStore = create<EventDetailState>()((set) => ({
  event: null,
  open: (event) => set({ event }),
  close: () => set({ event: null }),
}));
