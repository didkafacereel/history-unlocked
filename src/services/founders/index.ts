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

/**
 * Whether a founder seat may be SOLD by this build.
 *
 * The same hazard `src/services/purchases/index.native.ts` was hardened against,
 * one product along, and it had not been closed here. A release build with a
 * RevenueCat key but no `EXPO_PUBLIC_FOUNDERS_API` takes real money for a
 * $79.99 numbered seat and then answers with a number out of AsyncStorage, and
 * a date "claimed" on that phone alone. The buyer finds out when somebody else
 * is shown as keeping their day.
 *
 * One absent environment variable, and nothing said so. So: with no endpoint, a
 * build that can reach a store does not offer the tier at all. Debug builds keep
 * it, because the stand-in is how the whole flow stays reviewable and every
 * badge it produces says "Provisional" on its face.
 */
export function lifetimeIsSellable(): boolean {
  return API !== null || __DEV__;
}

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
