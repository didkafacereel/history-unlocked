/**
 * Re-cut the headlines that ended in "…", from the feed's own full sentence.
 *
 *   npx tsx pipeline/repair-truncated-titles.ts --fetch   save every date's feed sentences (once, ~4 min)
 *   npx tsx pipeline/repair-truncated-titles.ts           list the changes and the count left
 *   npx tsx pipeline/repair-truncated-titles.ts --apply   write pipeline/events-db.json, then publish
 *
 * The archive never stored the feed's sentence — only the headline cut from it
 * (`summary` is the article's lead, a different text, and re-cutting THAT was
 * tried in repair-titles.ts and produced encyclopedia definitions). So the
 * sentences are fetched again, once, into pipeline/.feed-cache/, and each cut
 * title is matched to the sentence it is a prefix of: same date, same year,
 * same opening words. A title with no confident match is left as it is.
 *
 * Cornerstones are skipped — their headlines are written by hand
 * (cornerstone-headlines.ts).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { manifestSchema } from '../src/data/manifest/schema';
import type { HistoricalEvent } from '../src/types/manifest';

import { fetchJson } from './archival';
import { clean, shortHeadline } from './headline';

const DB_PATH = path.resolve('pipeline/events-db.json');
const CACHE = path.resolve('pipeline/.feed-cache');
const FEED = 'https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all';

interface Line {
  year: number;
  text: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
function allDateKeys(): string[] {
  const days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days.flatMap((n, m) => Array.from({ length: n }, (_, d) => `${pad(m + 1)}-${pad(d + 1)}`));
}

async function fetchAll(): Promise<void> {
  mkdirSync(CACHE, { recursive: true });
  const keys = allDateKeys();
  let fetched = 0;
  for (const key of keys) {
    const file = path.join(CACHE, `${key}.json`);
    if (existsSync(file)) continue;
    const [m, d] = key.split('-');
    try {
      const feed = await fetchJson<{ selected?: Partial<Line>[]; events?: Partial<Line>[] }>(`${FEED}/${m}/${d}`);
      const lines = [...(feed.selected ?? []), ...(feed.events ?? [])]
        .filter((e): e is Line => typeof e.year === 'number' && typeof e.text === 'string')
        .map((e) => ({ year: e.year, text: e.text }));
      writeFileSync(file, JSON.stringify(lines));
      fetched++;
      if (fetched % 30 === 0) console.log(`  ${fetched} dates fetched (at ${key})`);
    } catch (error) {
      console.log(`  ! ${key}: ${(error as Error).message} — run --fetch again to retry`);
    }
    // One Wikimedia pipeline at a time, spaced: the feed throttles.
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log(`fetched ${fetched} new date(s) into ${path.relative(process.cwd(), CACHE)}`);
}

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ');

function fullSentenceFor(e: HistoricalEvent, lines: Line[]): string | null {
  const core = norm(e.title.replace(/…$/, '').trim());
  // The first 40 characters of the cut are the sentence's own opening words.
  const probe = core.slice(0, Math.min(core.length, 40));
  // Distinct texts: the feed lists its highlights twice, in `selected` and in
  // `events`, and the same sentence twice is one match, not an ambiguous two.
  const hits = [
    ...new Set(lines.filter((l) => l.year === e.year && norm(clean(l.text)).startsWith(probe)).map((l) => l.text)),
  ];
  return hits.length === 1 ? hits[0]! : null;
}

async function main(): Promise<void> {
  if (process.argv.includes('--fetch')) {
    await fetchAll();
    return;
  }
  const apply = process.argv.includes('--apply');
  // --sample N: N changes spread across the year instead of the first 25.
  const sampleArg = process.argv.indexOf('--sample');
  const SAMPLE_CAP = sampleArg === -1 ? 25 : 0;
  const SAMPLE_RATE = sampleArg === -1 ? 0 : Number(process.argv[sampleArg + 1] ?? 40) / 800;
  const db = JSON.parse(readFileSync(DB_PATH, 'utf8')) as { events: HistoricalEvent[] } & Record<string, unknown>;
  const cut = db.events.filter((e) => !e.cornerstone && e.title.endsWith('…'));
  let fixed = 0;
  let shorterCut = 0;
  let unmatched = 0;
  const samples: string[] = [];

  for (const e of cut) {
    const file = path.join(CACHE, `${e.dateKey}.json`);
    if (!existsSync(file)) {
      unmatched++;
      continue;
    }
    const full = fullSentenceFor(e, JSON.parse(readFileSync(file, 'utf8')) as Line[]);
    if (!full) {
      unmatched++;
      continue;
    }
    const next = shortHeadline(full);
    if (next === e.title) continue;
    if (next.endsWith('…')) {
      shorterCut++;
      continue; // still a cut: not worth churning the row
    }
    if (samples.length < SAMPLE_CAP || Math.random() < SAMPLE_RATE) samples.push(`  ${e.dateKey} ${e.year}\n    - ${e.title}\n    + ${next}`);
    e.title = next;
    fixed++;
  }

  const all = db.events.length;
  const left = db.events.filter((e) => e.title.endsWith('…')).length;
  console.log(samples.join('\n'));
  console.log(
    `\n${cut.length} cut headlines · ${fixed} now whole · ${shorterCut} still need a cut · ${unmatched} not matched` +
      `\nafter: ${left} of ${all} end in "…" (${((left / all) * 100).toFixed(1)}%)`,
  );

  if (apply && fixed > 0) {
    manifestSchema.shape.events.parse(db.events);
    writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + '\n');
    console.log(`written ${path.relative(process.cwd(), DB_PATH)} — now run: npm run pipeline:publish`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
