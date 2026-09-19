import { DailyDeck, DayRegister, HistoricalEvent, ScenarioQuestion } from '@/types/manifest';

import { ManifestFile, manifestSchema, quizPoolsFileSchema } from './manifest/schema';
import rawManifest from './manifest/sample-manifest.json';
import { readManifestCache, writeManifestCache } from './manifestCache';
import { MANIFEST_FETCH_TIMEOUT_MS, REMOTE_MANIFEST_URL, REMOTE_QUIZZES_URL } from './manifestSource';

/**
 * Ingestion boundary: manifest source → validated, ordered DailyDeck.
 *
 * Source priority, all gated through the same Zod schema:
 *   1. remote manifest (the daily pipeline's output) — cached on success
 *   2. last cached remote manifest (offline / slow network / bad payload)
 *   3. bundled fixture (first-ever launch offline)
 *
 * A malformed REMOTE manifest is survivable — we fall through and warn. A
 * malformed BUNDLED fixture is a build defect and throws loudly.
 */

export class ManifestValidationError extends Error {
  constructor(detail: string) {
    super(`Manifest rejected at ingestion boundary: ${detail}`);
    this.name = 'ManifestValidationError';
  }
}

/**
 * An eight-second budget, spelled out the long way.
 *
 * NOT `AbortSignal.timeout`, which is the browser's spelling and works on web
 * only: React Native replaces the global `AbortSignal` unconditionally with the
 * `abort-controller` package, and that one has no static `timeout`. The call
 * threw `TypeError` on every device launch, the catch below logged it as
 * "unreachable", and the app quietly served the bundled fixture forever while
 * the web build — where the global is the real one — looked perfect.
 */
function timeoutSignal(ms: number): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

async function fetchRemoteManifest(): Promise<ManifestFile | null> {
  if (!REMOTE_MANIFEST_URL) {
    return null;
  }
  /*
   * The timer covers the NETWORK only, and is cleared the moment the body is
   * in hand.
   *
   * It used to stay armed through `safeParse` as well, and validating 8056
   * events takes far longer than the eight-second budget — so on a cold start
   * the abort fired mid-validation, the catch below logged the archive as
   * "unreachable", and the reader silently got the seven-day fixture. Measured
   * on this machine: fetch 100 ms, JSON.parse 211 ms, Zod the rest of the
   * eight seconds. A budget meant for a slow network was quietly policing the
   * CPU.
   */
  let json: unknown;
  const { signal, done } = timeoutSignal(MANIFEST_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(REMOTE_MANIFEST_URL, { headers: { accept: 'application/json' }, signal });
    if (!res.ok) {
      console.warn(`[ingestion] remote manifest HTTP ${res.status}, falling back`);
      return null;
    }
    json = await res.json();
  } catch (e) {
    console.warn(`[ingestion] remote manifest unreachable (${String(e)}), falling back`);
    return null;
  } finally {
    done();
  }

  const result = manifestSchema.safeParse(json);
  if (!result.success) {
    console.warn('[ingestion] remote manifest failed validation, falling back');
    return null;
  }
  const parsed = result.data;

  // Deliberately after the return value is settled, and deliberately not
  // awaited into the same try. Storing the archive is a convenience for the
  // NEXT launch; a failure to store it must never discard the copy we are
  // holding, which is exactly the bug this shape exists to prevent.
  void writeManifestCache(json);
  return parsed;
}

async function readCachedManifest(): Promise<ManifestFile | null> {
  const stored = await readManifestCache();
  if (stored === null) {
    return null;
  }
  const parsed = manifestSchema.safeParse(stored);
  return parsed.success ? parsed.data : null;
}

function parseBundledManifest(): ManifestFile {
  const parsed = manifestSchema.safeParse(rawManifest);
  if (!parsed.success) {
    throw new ManifestValidationError(parsed.error.message);
  }
  return parsed.data;
}

/**
 * The resolved archive, held for the life of the process.
 *
 * Nineteen call sites reach for the manifest — the feed, the Museum, search,
 * the calendar, recall, simulations — and without this each one re-downloaded
 * 5.7 MB and re-validated 8056 events through Zod. Opening three screens cost
 * three full parses.
 *
 * Only a SUCCESSFUL resolution is held. Memoising a rejection would turn one
 * bad moment on a train into a permanently broken session.
 */
let inFlight: Promise<ManifestFile> | null = null;

async function resolveManifest(): Promise<ManifestFile> {
  inFlight ??= (async () =>
    (await fetchRemoteManifest()) ?? (await readCachedManifest()) ?? parseBundledManifest())();
  try {
    return await inFlight;
  } catch (error) {
    inFlight = null;
    throw error;
  }
}

/** Drop the held archive so the next read goes back to the network. */
export function invalidateManifest(): void {
  inFlight = null;
  quizzesInFlight = null;
}

let quizzesInFlight: Promise<ReadonlyMap<string, ScenarioQuestion[]>> | null = null;

/**
 * The authored questions, fetched only when a quiz is about to start.
 *
 * They are 2 MB gzipped of the archive's 5.7 and no screen outside a quiz
 * reads them, so `pipeline:publish` writes them beside the manifest rather
 * than inside it. Held for the process like the manifest, and for the same
 * reason: three routes ask for them and each ask is a download.
 *
 * Failure is not fatal anywhere. `attachQuizPools` simply returns the events
 * unchanged, `questionsFor` falls back to the generated questions, and the
 * reader gets a shallower quiz instead of an error — which is the right
 * trade for a file that is an enrichment, not the content itself.
 */
async function fetchQuizPools(): Promise<ReadonlyMap<string, ScenarioQuestion[]>> {
  const url = REMOTE_QUIZZES_URL;
  if (!url) {
    return new Map();
  }
  // Same shape as the manifest fetch: the timer is the network's, not the
  // validator's, and is cleared before parsing begins.
  let json: unknown;
  const { signal, done } = timeoutSignal(MANIFEST_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' }, signal });
    if (!res.ok) {
      console.warn(`[ingestion] quizzes HTTP ${res.status}; generated questions only`);
      return new Map();
    }
    json = await res.json();
  } catch (e) {
    console.warn(`[ingestion] quizzes unreachable (${String(e)}); generated questions only`);
    return new Map();
  } finally {
    done();
  }

  const parsed = quizPoolsFileSchema.safeParse(json);
  if (!parsed.success) {
    console.warn('[ingestion] quizzes failed validation; generated questions only');
    return new Map();
  }
  return new Map(Object.entries(parsed.data.quizzes));
}

export async function loadQuizPools(): Promise<ReadonlyMap<string, ScenarioQuestion[]>> {
  quizzesInFlight ??= fetchQuizPools();
  return quizzesInFlight;
}

/**
 * Put the authored questions back on the events that have them.
 *
 * Called by each of the three places a quiz can begin, immediately before it
 * begins. An event whose pool never arrives keeps its empty array and falls
 * through to the generated questions, so a slow network costs depth, never a
 * working screen.
 */
export async function attachQuizPools(
  events: readonly HistoricalEvent[],
): Promise<HistoricalEvent[]> {
  const pools = await loadQuizPools();
  if (pools.size === 0) {
    return [...events];
  }
  return events.map((event) => {
    const pool = pools.get(event.id);
    return pool && event.quizPool.length === 0 ? { ...event, quizPool: pool } : event;
  });
}

/**
 * One day, or nothing.
 *
 * There used to be an `allowFallbackToAll` option here: when today's date held
 * no events, the feed was handed the ENTIRE manifest instead, so that a sparse
 * early archive never looked empty. The archive now covers 366 days of 366, so
 * the only way that branch can fire is when the remote manifest did not load
 * and the bundled seven-day fixture does not reach today — and what it then
 * did was present events from other dates, sorted by year, under the heading
 * "today". An app whose single promise is "what happened on this date" must
 * not guess. Empty is honest; the feed offers a retry.
 */
export async function loadDailyDeck(dateKey: string): Promise<DailyDeck> {
  const manifest = await resolveManifest();
  const forDate = manifest.events.filter((e) => e.dateKey === dateKey);
  const events: HistoricalEvent[] = forDate.slice().sort((a, b) => a.year - b.year);

  // Absent on any manifest built before the register pass, and on dates it has
  // not reached yet — the card simply does not appear.
  const register: DayRegister | undefined = manifest.register?.find((r) => r.dateKey === dateKey);

  return { dateKey, events, register };
}

/**
 * The whole archive, validated. Only for screens that genuinely work across
 * every date (the Museum); the feed must keep loading one day at a time.
 */
export async function loadAllEvents(): Promise<HistoricalEvent[]> {
  const manifest = await resolveManifest();
  return manifest.events;
}

/**
 * Fetch specific events by id, in the order requested.
 *
 * The feed only ever holds one day, but a recall drill reviews whatever the
 * schedule says is due — which is spread across the whole archive. Ids that no
 * longer exist (an event dropped by a later pipeline run) are simply absent
 * from the result rather than throwing: a stale schedule entry must not be able
 * to break a review session.
 */
export async function loadEventsByIds(ids: readonly string[]): Promise<HistoricalEvent[]> {
  if (ids.length === 0) {
    return [];
  }
  const manifest = await resolveManifest();
  const byId = new Map(manifest.events.map((e) => [e.id, e]));
  return ids.map((id) => byId.get(id)).filter((e): e is HistoricalEvent => e !== undefined);
}

export interface ArchiveStats {
  events: number;
  days: number;
}

/**
 * Size of the archive behind the app. Shown against the reader's library count
 * so "events read" is a fraction of something real rather than a bare tally.
 */
export async function loadArchiveStats(): Promise<ArchiveStats> {
  try {
    const manifest = await resolveManifest();
    return {
      events: manifest.events.length,
      days: new Set(manifest.events.map((e) => e.dateKey)).size,
    };
  } catch {
    return { events: 0, days: 0 };
  }
}

/** Distinct "MM-DD" keys the archive covers — drives calendar day highlighting. */
export async function loadCoveredDateKeys(): Promise<string[]> {
  try {
    const manifest = await resolveManifest();
    return [...new Set(manifest.events.map((e) => e.dateKey))].sort();
  } catch {
    return [];
  }
}
