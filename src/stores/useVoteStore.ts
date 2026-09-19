import { create } from 'zustand';

import { DateTally, getVotingService } from '@/services/voting';

/**
 * The reader's ballot for the day on screen.
 *
 * Not persisted: whether a vote was cast is the server's fact, and a cached
 * "you voted" that the server disagrees with is worse than asking again. The
 * tally is held for the session and refetched when the date changes.
 *
 * Same rule as every store: subscribe to one field.
 */
interface VoteState {
  tally: DateTally | null;
  loading: boolean;

  /** Fetch the tally for a date. No-op when it is already the one held. */
  load: (dateKey: string) => Promise<void>;
  cast: (dateKey: string, eventId: string) => Promise<void>;
}

export const useVoteStore = create<VoteState>()((set, get) => ({
  tally: null,
  loading: false,

  load: async (dateKey) => {
    const { tally, loading } = get();
    if (loading || tally?.dateKey === dateKey) {
      return;
    }
    set({ loading: true });
    try {
      set({ tally: await getVotingService().getTally(dateKey) });
    } finally {
      set({ loading: false });
    }
  },

  cast: async (dateKey, eventId) => {
    set({ loading: true });
    try {
      set({ tally: await getVotingService().vote(dateKey, eventId) });
    } finally {
      set({ loading: false });
    }
  },
}));
