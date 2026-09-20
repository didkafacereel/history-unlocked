import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  FOUNDER_SEATS,
  FounderStatus,
  FoundersService,
  KEEPERS_PER_DATE,
} from './FoundersService';

/**
 * Device-local stand-in for the founders service.
 *
 * It exists so the whole flow — the seat, the claim, the name on the register —
 * can be built and reviewed before a server exists. It is NOT the feature: a
 * seat allocated here is unique to this phone, and two readers would happily
 * claim the same date. Every screen that shows a number from this provider says
 * so, because presenting a local guess as a global fact is the kind of lie that
 * is only discovered by the person who paid.
 */

const STORAGE_KEY = 'history-unlocked.founders.local.v1';

interface LocalState {
  seat: number | null;
  keptDate: string | null;
  displayName: string;
  /** Pretend history so the paywall's scarcity line has something to show. */
  seatsTaken: number;
  keepersByDate: Record<string, string[]>;
}

const EMPTY: LocalState = {
  seat: null,
  keptDate: null,
  displayName: '',
  // A plausible starting point, so the cap reads as a real ceiling in review
  // rather than as "1 of 122" on a fresh install.
  //
  // Kept inside the FIRST band deliberately. At 128 — fine when a band was 500
  // seats — it now lands in the second generation, and the paywall renders
  // "Second Generation · $79.99" because the name comes from the live seat
  // count while the price comes from the store. That is a true picture of a
  // misconfigured store, not of a working one, and it is the wrong thing for a
  // review build to be showing.
  seatsTaken: 37,
  keepersByDate: {},
};

async function read(): Promise<LocalState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<LocalState>) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

async function write(state: LocalState): Promise<LocalState> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // A founder seat that cannot be persisted is still better than a crash.
  }
  return state;
}

function statusOf(state: LocalState): FounderStatus {
  return {
    seat: state.seat,
    keptDate: state.keptDate,
    displayName: state.displayName,
    seatsTaken: state.seatsTaken,
  };
}

export const localFoundersService: FoundersService = {
  isLocal: true,

  getStatus: async () => statusOf(await read()),

  claimSeat: async () => {
    const state = await read();
    if (state.seat !== null) {
      return statusOf(state);
    }
    if (state.seatsTaken >= FOUNDER_SEATS) {
      return statusOf(state);
    }
    const seatsTaken = state.seatsTaken + 1;
    return statusOf(await write({ ...state, seat: seatsTaken, seatsTaken }));
  },

  checkDate: async (dateKey) => {
    const state = await read();
    const keepers = state.keepersByDate[dateKey] ?? [];
    return { dateKey, keepers, free: keepers.length < KEEPERS_PER_DATE };
  },

  claimDate: async (dateKey, displayName) => {
    const state = await read();
    if (state.seat === null) {
      return { ok: false, reason: 'not-a-founder' };
    }
    if (state.keptDate !== null) {
      return { ok: false, reason: 'already-claimed' };
    }
    const keepers = state.keepersByDate[dateKey] ?? [];
    if (keepers.length >= KEEPERS_PER_DATE) {
      return { ok: false, reason: 'taken' };
    }

    const next = await write({
      ...state,
      keptDate: dateKey,
      displayName,
      keepersByDate: { ...state.keepersByDate, [dateKey]: [...keepers, displayName] },
    });
    return { ok: true, status: statusOf(next) };
  },

  keepersFor: async (dateKey) => {
    const state = await read();
    return state.keepersByDate[dateKey] ?? [];
  },
};
