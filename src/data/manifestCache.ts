/**
 * Where the downloaded archive is kept between launches — web build.
 *
 * The browser's own HTTP cache already does this job, and neither
 * localStorage nor IndexedDB is worth 22 MB of JSON here, so the web build
 * simply does not cache. The native implementation lives in
 * `manifestCache.native.ts`.
 */

export async function readManifestCache(): Promise<unknown | null> {
  return null;
}

export async function writeManifestCache(_json: unknown): Promise<void> {
  // Nothing to do: see the note above.
}
