/**
 * Add the hand-picked events in `additions.ts` to the archive.
 *
 *   npx tsx pipeline/apply-additions.ts            list what would be added
 *   npx tsx pipeline/apply-additions.ts --apply    write pipeline/events-db.json
 *
 * Each event goes through the same path as a feed candidate — the backdrop is
 * the article's free lead image (licence-checked), the card is built by
 * `liteEventFrom`, and the row passes the manifest schema — so nothing about
 * an added event is hand-made except its words. Existing ids are left alone:
 * re-running is safe. Then `npm run pipeline:publish`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { historicalEventSchema, manifestSchema } from '../src/data/manifest/schema';
import type { HistoricalEvent } from '../src/types/manifest';

import { ADDITIONS } from './additions';
import { resolveImagesBatch } from './imagery';
import { liteEventFrom } from './lite';

const DB_PATH = path.resolve('pipeline/events-db.json');
const THUMB_WIDTH = 1200;
const apply = process.argv.includes('--apply');

async function main() {
  const db = JSON.parse(readFileSync(DB_PATH, 'utf8')) as { events: HistoricalEvent[] } & Record<string, unknown>;
  const ids = new Set(db.events.map((e) => e.id));

  const imageTitles = ADDITIONS.map((a) => a.imageTitle ?? a.wikiTitle);
  const images = await resolveImagesBatch(imageTitles, THUMB_WIDTH);

  const added: HistoricalEvent[] = [];
  let failed = 0;
  for (const a of ADDITIONS) {
    if (a.headline.length > 90) {
      console.log(`  ✗ ${a.dateKey} ${a.year}: headline is ${a.headline.length} characters (max 90)`);
      failed++;
      continue;
    }
    const image = images.get(a.imageTitle ?? a.wikiTitle);
    if (!image) {
      console.log(`  ✗ ${a.dateKey} ${a.year} ${a.wikiTitle}: no free lead image — set imageTitle`);
      failed++;
      continue;
    }
    const parsed = historicalEventSchema.safeParse(
      liteEventFrom(
        { year: a.year, summary: a.headline, wikiTitle: a.wikiTitle, extract: a.text, hasImage: true, curated: true },
        a.dateKey,
        { imageUrl: image.imageUrl, credit: image.credit, sourceUrl: image.sourceUrl, aspect: image.aspect },
      ),
    );
    if (!parsed.success) {
      console.log(`  ✗ ${a.dateKey} ${a.year}: ${parsed.error.issues[0]?.message ?? 'invalid'}`);
      failed++;
      continue;
    }
    const event = { ...(parsed.data as HistoricalEvent), ...(a.category ? { category: a.category } : {}) };
    if (ids.has(event.id)) {
      console.log(`  = ${event.id} already in the archive`);
      continue;
    }
    console.log(`  + ${event.id}\n      ${event.title}\n      [${event.category}] ${image.fileName}`);
    added.push(event);
  }

  console.log(`\n${added.length} to add, ${failed} failed`);
  if (!apply || added.length === 0) return;

  db.events.push(...added);
  // The archive is read by date; keep it in date-then-year order like the builder writes it.
  db.events.sort((x, y) => x.dateKey.localeCompare(y.dateKey) || x.year - y.year);
  manifestSchema.shape.events.parse(db.events);
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + '\n');
  console.log(`written ${path.relative(process.cwd(), DB_PATH)} — now run: npm run pipeline:publish`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
