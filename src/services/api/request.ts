/**
 * One call to our own backend (the Cloud Function behind EXPO_PUBLIC_FOUNDERS_API).
 *
 * Shared by every service that talks to it — founders and the launch gift —
 * so the two hard-won details below live in one place:
 *
 * - IDENTITY IS A SIGNED TOKEN, NOT A CLAIM. The caller's Firebase ID token is
 *   verified cryptographically on the server; an id in a header would be a
 *   claim anyone could make with curl.
 * - A FAILED REQUEST NEVER THROWS INTO THE UI. Any error, timeout or non-2xx
 *   answers null, and each service decides what "unknown" means for it.
 */

const TIMEOUT_MS = 6000;

export interface ApiConfig {
  baseUrl: string;
  /** A Firebase ID token for the signed-in reader, or null when nobody is. */
  authToken: () => Promise<string | null>;
}

/**
 * `AbortSignal.timeout` does not exist in React Native: the runtime's
 * `abort-controller` polyfill never had the static, the call throws inside the
 * try, and every request silently returns null — identically to being offline.
 * The same trap is spelled out in `src/data/ingestion.ts`.
 */
function timeoutSignal(ms: number): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

/**
 * @param auth 'required' refuses to call without a signed-in reader;
 *   'optional' calls either way and lets the server decide what an anonymous
 *   caller sees — withholding on the device would be decoration, since the
 *   payload would already be here.
 */
export async function apiRequest<T>(
  config: ApiConfig,
  path: string,
  init?: RequestInit,
  auth: 'required' | 'optional' = 'required',
): Promise<T | null> {
  const token = await config.authToken();
  if (!token && auth === 'required') {
    return null;
  }
  const { signal, done } = timeoutSignal(TIMEOUT_MS);
  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
      signal,
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  } finally {
    // Cleared before the caller parses anything: an armed timer that fires
    // after a successful response aborts nothing but keeps the process awake.
    done();
  }
}

/** The configured backend, or null in a build without one. */
export const API_BASE_URL: string | null =
  process.env.EXPO_PUBLIC_FOUNDERS_API?.trim().replace(/\/+$/, '') || null;
