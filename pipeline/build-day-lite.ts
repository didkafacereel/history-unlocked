/**
 * Build a day of real content with NO API key and NO cost.
 *
 *   npx tsx pipeline/build-day-lite.ts --date 09-08 [--count 12] [--days 7]
 *                                      [--no-fixture] [--dry]
 *
 * Every event is a verified Wikimedia "on this day" entry with a freely
 * licensed image resolved from its article. This is what gives all 366 days
 * something real to show today; the LLM pass (build-day.ts) later replaces a
 * date's entries with authored copy and scenario quizzes.
 *
 * Writes to pipeline/events-db.json, and — unless --no-fixture — also to the
 * bundled offline manifest so the app shows the content immediately without
 * any hosting.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

import { manifestSchema, historicalEventSchema } from '../src/data/manifest/schema';
import { todayDateKey } from '../src/lib/dateKey';
import { cornerstoneCandidates } from './cornerstones';
import { resolveImagesBatch } from './imagery';
import { liteEventFrom } from './lite';
import { fetchDayCandidates } from './onthisday';

/** The validated shape both the database and the fixture store. */
type StoredEvent = z.infer<typeof historicalEventSchema>;

const DB_PATH = path.resolve('pipeline/events-db.json');
const FIXTURE_PATH = path.resolve('src/data/manifest/sample-manifest.json');
const THUMB_WIDTH = 1200;
const DEFAULT_COUNT = 22;
/**
 * A day costs only two batched API calls now, so this pause between DAYS is
 * what keeps a 366-day run polite. Backoff in archival.ts is the safety net.
 */
const REQUEST_SPACING_MS = 700;
/**
 * Resolve imagery for more candidates than we need: some have no picture and
 * some are not freely licensed, and this way one batch still yields a full day.
 *
 * `count + headroom` must stay under 50 — that is the per-request title limit on
 * both Wikimedia endpoints, and staying inside it is why a day of 22 events
 * costs exactly the same two API calls as a day of 10 did.
 */
const RESOLVE_HEADROOM = 8;

function readArg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return v && !v.startsWith('--') ? v : null;
}

function dateRange(startKey: string, days: number): string[] {
  const [mm = 1, dd = 1] = startKey.split('-').map(Number);
  return Array.from({ length: Math.max(1, days) }, (_, i) => {
    const d = new Date(2024, mm - 1, dd + i);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function buildDate(dateKey: string, count: number): Promise<StoredEvent[]> {
  const [feed, forced] = await Promise.all([
    fetchDayCandidates(dateKey),
    cornerstoneCandidates(dateKey),
  ]);

  // Cornerstones go first and displace the feed's account of the same event, so
  // a day can never lose what it is actually known for — the feed's curated list
  // for 7 December does not contain Pearl Harbor at all.
  //
  // Matching on the YEAR, not the article: the feed files the 2001 attacks under
  // "Al-Qaeda" while the cornerstone names "September 11 attacks", and by title
  // alone both survive and 11 September opens with the same event twice. Two
  // entries sharing a date AND a year are the same event often enough that
  // dropping the feed's version is the right trade against a visible duplicate.
  const forcedTitles = new Set(forced.map((c) => c.wikiTitle));
  const forcedYears = new Set(forced.map((c) => c.year));
  const candidates = [
    ...forced,
    ...feed.filter((c) => !forcedTitles.has(c.wikiTitle) && !forcedYears.has(c.year)),
  ];
  console.log(
    `\n=== ${dateKey}: ${candidates.length} candidates` +
      `${forced.length > 0 ? ` (${forced.length} cornerstone)` : ''} ===`,
  );

  const built: StoredEvent[] = [];
  const usedCategories = new Set<string>();

  // Two batched calls cover the whole day's imagery.
  const withImage = candidates.filter((c) => c.hasImage);
  const shortlist = withImage.slice(0, count + RESOLVE_HEADROOM);
  const images = await resolveImagesBatch(
    shortlist.map((c) => c.wikiTitle),
    THUMB_WIDTH,
  );

  for (const candidate of shortlist) {
    if (built.length >= count) break;

    const image = images.get(candidate.wikiTitle);
    if (!image) continue;

    const parsed = historicalEventSchema.safeParse(
      liteEventFrom(candidate, dateKey, {
        imageUrl: image.imageUrl,
        credit: image.credit,
        sourceUrl: image.sourceUrl,
        aspect: image.aspect,
      }),
    );
    if (!parsed.success) {
      console.warn(`  ~ ${candidate.wikiTitle}: ${parsed.error.issues[0]?.message ?? 'invalid'}`);
      continue;
    }

    built.push(parsed.data);
    usedCategories.add(parsed.data.category ?? '?');
    console.log(
      `  ✓ ${String(parsed.data.year).padStart(5)}  [${parsed.data.category}]  ${parsed.data.title.slice(0, 62)}`,
    );
  }

  console.log(`  built ${built.length} events across ${usedCategories.size} categories`);
  return built;
}

/** A full-year run is long; flush often enough that a crash costs little. */
const FLUSH_EVERY_DAYS = 10;

function loadEvents(file: string): Map<string, StoredEvent> {
  const manifest = manifestSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
  return new Map(manifest.events.map((e) => [e.id, e]));
}

function writeEvents(file: string, byId: Map<string, StoredEvent>): number {
  const merged = manifestSchema.parse({
    version: 1,
    generatedAt: new Date().toISOString(),
    events: [...byId.values()].sort(
      (a, b) => a.dateKey.localeCompare(b.dateKey) || a.year - b.year,
    ),
  });
  writeFileSync(file, `${JSON.stringify(merged, null, 2)}\n`);
  return merged.events.length;
}

/**
 * Swap in a freshly built day. LLM-authored events (the ones carrying a quiz)
 * survive — a lite rebuild must never downgrade richer content.
 */
function applyDay(byId: Map<string, StoredEvent>, dateKey: string, events: StoredEvent[]): void {
  for (const [id, event] of byId) {
    if (event.dateKey === dateKey && event.quizPool.length === 0) {
      byId.delete(id);
    }
  }
  for (const event of events) {
    if (!byId.has(event.id)) {
      byId.set(event.id, event);
    }
  }
}

async function main(): Promise<void> {
  const startKey = readArg('--date') ?? todayDateKey();
  const days = Number(readArg('--days') ?? '1');
  const count = Number(readArg('--count') ?? String(DEFAULT_COUNT));
  const dry = process.argv.includes('--dry');
  const skipFixture = process.argv.includes('--no-fixture');

  const dateKeys = dateRange(startKey, days);
  const db = dry ? new Map<string, StoredEvent>() : loadEvents(DB_PATH);
  const fixture = dry || skipFixture ? null : loadEvents(FIXTURE_PATH);

  let builtTotal = 0;
  const startedAt = Date.now();

  const failed: string[] = [];

  for (const [index, dateKey] of dateKeys.entries()) {
    // One bad day must not end a 366-day run. `fetchJson` already retries a
    // transient fault five times, so reaching here means the date is genuinely
    // unbuildable right now — note it, keep the days already flushed, move on.
    let events: StoredEvent[];
    try {
      events = await buildDate(dateKey, count);
    } catch (error) {
      failed.push(dateKey);
      console.warn(`  ! ${dateKey} failed: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    builtTotal += events.length;

    if (!dry) {
      applyDay(db, dateKey, events);
      if (fixture) {
        applyDay(fixture, dateKey, events);
      }

      const isLast = index === dateKeys.length - 1;
      if (isLast || (index + 1) % FLUSH_EVERY_DAYS === 0) {
        const total = writeEvents(DB_PATH, db);
        if (fixture) {
          writeEvents(FIXTURE_PATH, fixture);
        }
        const mins = ((Date.now() - startedAt) / 60000).toFixed(1);
        console.log(
          `  … flushed ${index + 1}/${dateKeys.length} days · ${total} events in db · ${mins} min elapsed`,
        );
      }
    }

    if (index < dateKeys.length - 1) {
      await sleep(REQUEST_SPACING_MS);
    }
  }

  if (dry) {
    console.log(`\nDry run: ${builtTotal} events built, nothing written.`);
    return;
  }

  console.log(
    `\nDone: ${builtTotal} events across ${dateKeys.length - failed.length} of ${dateKeys.length} day(s).`,
  );
  if (failed.length > 0) {
    // Named, not just counted: these are the dates to re-run, and a silent
    // shortfall in a 366-day archive is invisible until a reader finds it.
    console.log(`Failed and NOT rebuilt (${failed.length}): ${failed.join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
