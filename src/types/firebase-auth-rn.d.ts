import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth';

/**
 * `getReactNativePersistence` exists, and TypeScript cannot see it.
 *
 * `@firebase/auth` ships a React Native build behind an export condition:
 *
 *   "react-native": { "types": "./dist/rn/index.rn.d.ts", "default": "./dist/rn/index.js" }
 *
 * Metro applies that condition, so at runtime the function is there — and
 * `firebase/auth` is literally `export * from '@firebase/auth'`, so it comes
 * through the umbrella too. `tsc` does not apply the condition; it resolves the
 * default `auth-public.d.ts`, which is the web surface and has no such export.
 *
 * So the import compiles to working code and fails to typecheck. Rather than
 * deep-importing `@firebase/auth/dist/rn/index.js` — a path inside someone
 * else's package that a patch release may move — the missing signature is
 * declared here, copied exactly from
 * `dist/.../platform_react_native/persistence/react_native.d.ts`.
 *
 * If a future Firebase adds the condition to its own typings, this becomes a
 * duplicate declaration and tsc will say so. That is the right failure: it
 * tells us to delete the file rather than leaving a stale shim behind.
 */
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
