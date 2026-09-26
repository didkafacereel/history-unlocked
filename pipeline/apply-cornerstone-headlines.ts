/**
 * Put the written cornerstone headlines (cornerstone-headlines.ts) on the
 * events already in the archive, without a rebuild.
 *
 *   npx tsx pipeline/apply-cornerstone-headlines.ts           list the changes
 *   npx tsx pipeline/apply-cornerstone-headlines.ts --apply   write pipeline/events-db.json
 *
 * Then `npm run pipeline:publish`. Only `title` changes; a cornerstone's facts
 * and summary are its article's, and stay. New builds pick the headlines up in
 * `cornerstoneCandidates`, so this is a one-off for rows written before them.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { manifestSchema } from '../src/data/manifest/schema';
import type { HistoricalEvent } from '../src/types/manifest';

import { CORNERSTONE_HEADLINES, headlineKey } from './cornerstone-headlines';

const DB_PATH = path.resolve('pipeline/events-db.json');
const apply = process.argv.includes('--apply');

const db = JSON.parse(readFileSync(DB_PATH, 'utf8')) as { events: HistoricalEvent[] } & Record<string, unknown>;
let changed = 0;
let missing = 0;
for (const e of db.events) {
  if (!e.cornerstone) continue;
  const headline = CORNERSTONE_HEADLINES[headlineKey(e.dateKey, e.year)];
  if (!headline) {
    missing++;
    console.log(`  ? no headline for ${e.dateKey} ${e.year} — ${e.title}`);
    continue;
  }
  if (e.title === headline) continue;
  console.log(`  ${e.dateKey} ${e.year}\n    - ${e.title}\n    + ${headline}`);
  e.title = headline;
  changed++;
}
console.log(`\n${changed} headline(s) to change, ${missing} cornerstone(s) without one`);

if (apply && changed > 0) {
  // The same gate the publisher uses: a bad row must not reach the file.
  manifestSchema.shape.events.parse(db.events);
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + '\n');
  console.log(`written ${path.relative(process.cwd(), DB_PATH)} — now run: npm run pipeline:publish`);
}
