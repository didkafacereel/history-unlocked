import { FoundersService } from './FoundersService';
import { localFoundersService } from './localFoundersService';
import { createRemoteFoundersService } from './remoteFoundersService';

export * from './FoundersService';

/**
 * Pick the founders provider once, the same way billing picks its own.
 *
 * With no endpoint configured the device-local stand-in runs, so the whole
 * flow is reviewable today — and every screen that shows one of its numbers
 * says out loud that it is not yet global.
 */
const API = process.env.EXPO_PUBLIC_FOUNDERS_API?.trim().replace(/\/+$/, '') || null;

let service: FoundersService | null = null;

export function getFoundersService(): FoundersService {
  service ??= API
    ? createRemoteFoundersService({
        baseUrl: API,
        // Wired to RevenueCat's app user id once billing is live; until then a
        // remote endpoint simply has nobody to identify and degrades to
        // "unknown" rather than inventing an identity.
        appUserId: () => process.env.EXPO_PUBLIC_FOUNDERS_TEST_USER?.trim() || null,
      })
    : localFoundersService;
  return service;
}
