/**
 * Apply the curated backdrop corrections in `pipeline/image-overrides.ts`.
 *
 *   npx tsx pipeline/apply-image-overrides.ts [--dry]
 *
 * Separate from the archival pass because it must be re-runnable on its own and
 * must never be skipped by that pass's "already has an image" short-circuit —
 * these events all HAVE an image, that is the problem.
 *
 * Idempotent: it resolves and writes the same image every time, so it is safe
 * to run after any rebuild. Run it after `pipeline:lite` or `pipeline:archival`
 * touches the events DB, or a rebuild will quietly restore the bad picture.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { manifestSchema } from '../src/data/manifest/schema';
import { resolveArchivalImage } from './archival';
import { IMAGE_OVERRIDES } from './image-overrides';

const DB_PATH = path.resolve('pipeline/events-db.json');
const THUMB_WIDTH = 1200;

async function main(): Promise<void> {
  const dry = process.argv.includes('--dry');
  const db = manifestSchema.parse(JSON.parse(readFileSync(DB_PATH, 'utf8')));
  const byId = new Map(db.events.map((e) => [e.id, e]));

  let applied = 0;
  let missing = 0;

  for (const override of IMAGE_OVERRIDES) {
    const event = byId.get(override.eventId);
    if (!event) {
      // A rebuild can legitimately drop an event; say so rather than failing,
      // so one stale entry cannot block the rest.
      console.warn(`  ~ ${override.eventId} is not in the database — skipped`);
      missing++;
      continue;
    }

    const image = await resolveArchivalImage({
      wikiTitle: override.wikiTitle,
      fallbackQuery: override.wikiTitle,
      width: THUMB_WIDTH,
    });
    if (!image) {
      console.warn(`  ~ "${override.wikiTitle}" has no freely-licensed image — skipped`);
      missing++;
      continue;
    }

    const before = decodeURIComponent(event.imageUrl.split('/').pop() ?? '');
    const after = decodeURIComponent(image.imageUrl.split('/').pop() ?? '');

    // The credit fields travel with the url, always. They are the licence
    // terms, and an override that changed the picture but kept the old
    // attribution would be a licence breach as well as a lie.
    event.imageUrl = image.imageUrl;
    event.imageCredit = image.credit;
    event.imageSourceUrl = image.sourceUrl;
    event.imageAspect = image.aspect;

    applied++;
    console.log(`  ✓ ${event.year} ${event.title.slice(0, 46)}`);
    console.log(`      ${before.slice(0, 60)}`);
    console.log(`   →  ${after.slice(0, 60)}  [${image.credit}]`);
  }

  if (dry) {
    console.log(`\nDry run — ${applied} would change, ${missing} skipped. Nothing written.`);
    return;
  }

  const merged = manifestSchema.parse({
    version: 1,
    generatedAt: new Date().toISOString(),
    events: db.events.sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.year - b.year),
  });
  writeFileSync(DB_PATH, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`\n${applied} applied, ${missing} skipped → pipeline/events-db.json`);
  if (applied > 0) {
    console.log('Next: npm run pipeline:publish && npm run pipeline:fixture');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
