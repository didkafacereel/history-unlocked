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

const UNKNOWN: FounderStatus = {
  lifetime: false,
  seat: null,
  keptDate: null,
  displayName: '',
  seatsTaken: 0,
};

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

  /**
   * Read the reader's standing, and repair it if it is half-finished.
   *
   * THE REPAIR IS THE POINT. A seat used to be allocated from exactly one
   * place — the paywall, immediately after paying — and that call raced the
   * RevenueCat webhook and usually lost, because the server had not been told
   * about the purchase yet and answered 403. The failure was silent, nothing
   * retried, and no other code path ever allocated a seat: `restore` refreshed
   * but never claimed, and so did launch. Somebody could pay $79.99 and be
   * permanently unable to claim a day.
   *
   * The webhook now allocates the seat itself, which removes the race. This is
   * the second line: every launch, every sign-in and every restore comes
   * through here, so a founder the server knows about but has not numbered gets
   * numbered on the next thing they do — including a reader whose purchase only
   * reached the server minutes later.
   *
   * Guarded on `lifetime`, which only the server asserts, so a failed request
   * (UNKNOWN, lifetime false) can never trigger a claim.
   */
  refresh: async () => {
    if (get().loading) {
      return;
    }
    set({ loading: true });
    try {
      const status = await getFoundersService().getStatus();
      set({ status, loaded: true });
      if (status.lifetime && status.seat === null) {
        set({ status: await getFoundersService().claimSeat() });
      }
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
