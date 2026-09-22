import { getAuthService } from '@/services/auth';

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
        // A Firebase ID token, or null when nobody is signed in. The server
        // verifies the signature, so this is the one identity claim in the app
        // that the caller cannot simply assert.
        //
        // Read through `getAuthService()` rather than Firebase directly, so a
        // build running the stand-in returns null here instead of reaching for
        // an SDK it never initialised.
        authToken: () => getAuthService().idToken(),
      })
    : localFoundersService;
  return service;
}
