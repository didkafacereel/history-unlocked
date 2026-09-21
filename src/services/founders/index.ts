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
        // Wired to Firebase Auth once it is installed. Until then there is no
        // token to send, every call short-circuits to null, and the screens
        // show "unknown" — which is honest: nobody is signed in, so nobody can
        // be identified. Deliberately NOT a fallback to some device id; an
        // identity the server cannot verify is worse than none.
        authToken: async () => null,
      })
    : localFoundersService;
  return service;
}
