import { create } from 'zustand';

import {
  FOUNDER_SEATS,
  FounderStatus,
  getFoundersService,
} from '@/services/founders';

/**
 * The reader's founder standing.
 *
 * Nothing here is persisted. A seat number and a kept date are facts the SERVER
 * owns — caching them on the device would mean a reader who was refunded, or
 * who reinstalled, keeps showing a badge the archive no longer agrees with.
 * The screens hold the last fetched value for the session and refetch on
 * launch; that is the honest trade.
 *
 * Same rule as every store: subscribe to one field.
 */

const UNKNOWN: FounderStatus = { seat: null, keptDate: null, displayName: '', seatsTaken: 0 };

interface FoundersState {
  status: FounderStatus;
  loading: boolean;
  /** Set once a fetch has completed, so the UI can tell "no" from "not yet". */
  loaded: boolean;

  refresh: () => Promise<void>;
  /** Called after a lifetime purchase. Idempotent. */
  claimSeat: () => Promise<void>;
  claimDate: (dateKey: string, displayName: string) => Promise<'ok' | 'taken' | 'failed'>;
}

export const useFoundersStore = create<FoundersState>()((set, get) => ({
  status: UNKNOWN,
  loading: false,
  loaded: false,

  refresh: async () => {
    if (get().loading) {
      return;
    }
    set({ loading: true });
    try {
      set({ status: await getFoundersService().getStatus(), loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  claimSeat: async () => {
    set({ status: await getFoundersService().claimSeat(), loaded: true });
  },

  claimDate: async (dateKey, displayName) => {
    const result = await getFoundersService().claimDate(dateKey, displayName.trim());
    if (result.ok) {
      set({ status: result.status, loaded: true });
      return 'ok';
    }
    return result.reason === 'taken' ? 'taken' : 'failed';
  },
}));

/** Seats left, for the paywall's scarcity line. Never negative. */
export const useSeatsRemaining = () =>
  useFoundersStore((s) => Math.max(FOUNDER_SEATS - s.status.seatsTaken, 0));

/** This reader's seat number, or null. */
export const useFounderSeat = () => useFoundersStore((s) => s.status.seat);
