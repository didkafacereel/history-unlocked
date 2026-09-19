import { create } from 'zustand';

import { TacticalData } from '@/types/manifest';

/**
 * Tactical overlay state, isolated from the feed store on purpose: opening
 * or closing the sheet must never invalidate a single feed card.
 *
 * The sheet's drag physics live on the UI thread inside TacticalOverlay;
 * this store only knows "what payload is showing", set once per open/close.
 */

export interface TacticalPayload {
  eventTitle: string;
  tactical: TacticalData;
}

interface OverlayState {
  payload: TacticalPayload | null;
  open: (payload: TacticalPayload) => void;
  close: () => void;
}

export const useOverlayStore = create<OverlayState>()((set) => ({
  payload: null,
  open: (payload) => set({ payload }),
  close: () => set({ payload: null }),
}));
