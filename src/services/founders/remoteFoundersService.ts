import {
  ClaimResult,
  DateAvailability,
  FounderStatus,
  FoundersService,
} from './FoundersService';
import { apiRequest, type ApiConfig } from '@/services/api/request';

/**
 * The real founders service, once an endpoint exists.
 *
 *   GET  /founders/me
 *   POST /founders/seat
 *   GET  /founders/dates
 *   GET  /founders/date/:dateKey
 *   POST /founders/date/:dateKey   { displayName }
 *
 * IDENTITY IS A SIGNED TOKEN, NOT A CLAIM. This used to send the reader's
 * RevenueCat app-user id in an `x-app-user-id` header, with a note saying the
 * server should check it against RevenueCat. That check answers the wrong
 * question: it proves the named user owns Lifetime, never that the caller is
 * that user. Anyone who learned another founder's id — and it travels in every
 * request — could have taken a seat or a date as them, with curl.
 *
 * A Firebase ID token is verified cryptographically on the other end, so the
 * uid the server reads cannot be asserted by the caller. It is also why
 * claiming needs an account at all: buying can stay anonymous because Google
 * takes the money, but writing a permanent public name into a shared register
 * needs the writer to be provable.
 *
 * A failed request never throws into the UI. A founder whose seat cannot be
 * read right now is a founder with a network problem, not a former founder, so
 * calls degrade to "unknown" and the screens show their last known state.
 */

type RemoteConfig = ApiConfig;

const request = apiRequest;

const UNKNOWN: FounderStatus = {
  // False rather than unknown: a request that failed must never present the
  // reader as a founder, and the self-heal in the store must not fire on a
  // network error. The next successful refresh tells the truth.
  lifetime: false,
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

    // Open to anyone: this is the line under a day in the register, and that
    // register is free for every reader, signed in or not.
    keepersFor: async (dateKey) => {
      const found = await request<DateAvailability>(
        config,
        `/founders/date/${dateKey}`,
        undefined,
        'optional',
      );
      return found?.keepers ?? [];
    },

    // A whole year in one response, keyed "MM-DD". Open to anyone for the same
    // reason: the calendar sells the tier, so it cannot require the tier.
    //
    // `request` already answers null on any failure, and null becomes an empty
    // map here — the calendar then draws every day as unclaimed, which is the
    // honest reading of "could not be reached" for a screen whose whole
    // content is who has taken what.
    keptDates: async () =>
      (await request<Record<string, string>>(config, '/founders/dates', undefined, 'optional')) ??
      {},

    // `request` answers null on anything but a 2xx, and here that has to mean
    // "not deleted". Every other call degrades to a harmless unknown; this one
    // degrades to a claim that somebody's account is gone when it is not, which
    // they would only discover by signing in again months later.
    deleteAccount: async () =>
      (await request<{ ok?: boolean }>(config, '/account', { method: 'DELETE' })) !== null,
  };
}
