import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_BASE_URL, apiRequest } from '@/services/api/request';
import { getAuthService } from '@/services/auth';

import { WELCOME_CAP, WELCOME_DAYS, WelcomeClaim, WelcomeGrant, WelcomeService, WelcomeStatus } from './WelcomeService';

export * from './WelcomeService';

/**
 * Provider resolution, the same shape as founders and billing:
 *   endpoint configured      → the real server
 *   no endpoint, debug build → a device-local stand-in, so the greeting can be
 *                              reviewed without a backend
 *   no endpoint, release     → nothing: a release build must not hand out Pro
 *                              it cannot back, and a gift nobody records is
 *                              one anybody can reinstall their way to again
 */

const remote = (baseUrl: string): WelcomeService => {
  const config = { baseUrl, authToken: () => getAuthService().idToken() };
  return {
    isLocal: false,
    status: async () =>
      (await apiRequest<WelcomeStatus>(config, '/welcome', undefined, 'optional')) ?? {
        remaining: null,
        mine: null,
        serverNow: null,
      },
    claim: async () =>
      (await apiRequest<WelcomeClaim>(config, '/welcome', { method: 'POST' })) ?? { status: 'unavailable' },
  };
};

const LOCAL_KEY = 'history-unlocked.welcome.local.v1';
const DAY_MS = 24 * 60 * 60 * 1000;

const local: WelcomeService = {
  isLocal: true,
  status: async () => {
    const raw = await AsyncStorage.getItem(LOCAL_KEY).catch(() => null);
    const mine = raw ? (JSON.parse(raw) as WelcomeGrant) : null;
    return { remaining: WELCOME_CAP - 1283, mine, serverNow: Date.now() };
  },
  claim: async () => {
    const now = Date.now();
    const raw = await AsyncStorage.getItem(LOCAL_KEY).catch(() => null);
    if (raw) {
      return { status: 'existing', grant: JSON.parse(raw) as WelcomeGrant, remaining: WELCOME_CAP - 1284, serverNow: now };
    }
    // A plausible number, so the greeting reads as it will in production.
    const grant: WelcomeGrant = { number: 1284, startedAt: now, endsAt: now + WELCOME_DAYS * DAY_MS };
    await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(grant)).catch(() => {});
    return { status: 'granted', grant, remaining: WELCOME_CAP - 1284, serverNow: now };
  },
};

const unavailable: WelcomeService = {
  isLocal: false,
  status: async () => ({ remaining: null, mine: null, serverNow: null }),
  claim: async () => ({ status: 'unavailable' }),
};

let service: WelcomeService | null = null;

export function getWelcomeService(): WelcomeService {
  service ??= API_BASE_URL ? remote(API_BASE_URL) : __DEV__ ? local : unavailable;
  return service;
}
