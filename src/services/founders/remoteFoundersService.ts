import {
  ClaimResult,
  DateAvailability,
  FounderStatus,
  FoundersService,
} from './FoundersService';

/**
 * The real founders service, once an endpoint exists.
 *
 * Four routes, all keyed on the reader's RevenueCat app-user id, which the
 * server must verify against RevenueCat before allocating anything — otherwise
 * a seat is a POST away and the scarcity that makes the tier worth buying is
 * fiction.
 *
 *   GET  /founders/me
 *   POST /founders/seat
 *   GET  /founders/date/:dateKey
 *   POST /founders/date/:dateKey   { displayName }
 *
 * A failed request never throws into the UI. A founder whose seat cannot be
 * read right now is a founder with a network problem, not a former founder, so
 * calls degrade to "unknown" and the screens show their last known state.
 */

const TIMEOUT_MS = 6000;

interface RemoteConfig {
  baseUrl: string;
  /** Identifies the reader to the server; verified there against RevenueCat. */
  appUserId: () => string | null;
}

async function request<T>(
  config: RemoteConfig,
  path: string,
  init?: RequestInit,
): Promise<T | null> {
  const userId = config.appUserId();
  if (!userId) {
    return null;
  }
  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-app-user-id': userId,
        ...init?.headers,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const UNKNOWN: FounderStatus = {
  seat: null,
  keptDate: null,
  displayName: '',
  seatsTaken: 0,
};

export function createRemoteFoundersService(config: RemoteConfig): FoundersService {
  return {
    isLocal: false,

    getStatus: async () =>
      (await request<FounderStatus>(config, '/founders/me')) ?? UNKNOWN,

    claimSeat: async () =>
      (await request<FounderStatus>(config, '/founders/seat', { method: 'POST' })) ?? UNKNOWN,

    checkDate: async (dateKey) =>
      (await request<DateAvailability>(config, `/founders/date/${dateKey}`)) ?? {
        dateKey,
        keepers: [],
        free: false,
      },

    claimDate: async (dateKey, displayName) =>
      (await request<ClaimResult>(config, `/founders/date/${dateKey}`, {
        method: 'POST',
        body: JSON.stringify({ displayName }),
      })) ?? { ok: false, reason: 'unavailable' },

    keepersFor: async (dateKey) => {
      const found = await request<DateAvailability>(config, `/founders/date/${dateKey}`);
      return found?.keepers ?? [];
    },
  };
}
