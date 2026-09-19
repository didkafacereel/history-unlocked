/**
 * Backfill event backdrops with authentic archival imagery.
 *
 *   npx tsx pipeline/fetch-archival.ts [--force] [--dry]
 *
 * Resolves each event's image from its Wikipedia article (see archival.ts),
 * then writes the URL, attribution, and source link into BOTH the master
 * database (pipeline/events-db.json) and the bundled offline fixture
 * (src/data/manifest/sample-manifest.json). Both files are re-validated
 * through the app's own Zod schema before anything is written.
 *
 * Skips events that already carry a non-placeholder image unless --force.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { manifestSchema } from '../src/data/manifest/schema';
import { resolveArchivalImage } from './archival';

const DB_PATH = path.resolve('pipeline/events-db.json');
const FIXTURE_PATH = path.resolve('src/data/manifest/sample-manifest.json');
const THUMB_WIDTH = 1200;

/**
 * One-time backfill for events created before `wikiTitle` existed. Hand-picked
 * so the lead image is unmistakably the right one — for example the Kennedy
 * entry resolves to the photograph of that exact broadcast. New events get
 * `wikiTitle` straight from the content generator instead.
 */
const SEED_WIKI_TITLES: Record<string, string> = {
  'evt-1509-henry-viii-marriage': 'Henry VIII',
  'evt-1770-endeavour-reef': 'HMS Endeavour',
  'evt-1776-committee-of-five': 'Committee of Five',
  'evt-1944-normandy-linkup': 'Normandy landings',
  'evt-1963-jfk-civil-rights': 'Report to the American People on Civil Rights',
};

/** Anything from a stock/placeholder host is by definition not event-specific. */
function isPlaceholder(imageUrl: string): boolean {
  return /picsum\.photos|placehold|unsplash\.com\/random|loremflickr/i.test(imageUrl);
}

function readManifest(file: string) {
  return manifestSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  const dry = process.argv.includes('--dry');

  const db = readManifest(DB_PATH);

  // id → resolved image, so the fixture gets exactly what the database got.
  const resolved = new Map<
    string,
    {
      imageUrl: string;
      imageCredit: string;
      imageSourceUrl: string;
      imageAspect: number;
      wikiTitle: string;
    }
  >();

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const event of db.events) {
    const wikiTitle = event.wikiTitle ?? SEED_WIKI_TITLES[event.id];

    if (!force && !isPlaceholder(event.imageUrl) && event.imageCredit) {
      skipped++;
      continue;
    }

    try {
      const image = await resolveArchivalImage({
        wikiTitle,
        fallbackQuery: `${event.title} ${event.region} ${event.year}`,
        width: THUMB_WIDTH,
      });

      if (!image) {
        failed++;
        console.error(`  ✗ ${event.id}: no freely-licensed image found — leaving as is`);
        continue;
      }

      resolved.set(event.id, {
        imageUrl: image.imageUrl,
        imageCredit: image.credit,
        imageSourceUrl: image.sourceUrl,
        imageAspect: image.aspect,
        wikiTitle: wikiTitle ?? event.title,
      });
      updated++;
      const shape = image.aspect > 0.9 ? 'landscape → letterboxed' : 'portrait → full bleed';
      console.log(`  ✓ ${event.id}`);
      console.log(`      ${image.fileName}`);
      console.log(`      ${image.credit}`);
      console.log(`      aspect ${image.aspect} (${shape})`);
    } catch (error) {
      failed++;
      console.error(`  ✗ ${event.id}: ${String(error)}`);
    }
  }

  if (dry) {
    console.log(`\nDry run: ${updated} would update, ${skipped} skipped, ${failed} failed.`);
    return;
  }

  // Apply to both files, keyed by event id, then re-validate before writing.
  for (const file of [DB_PATH, FIXTURE_PATH]) {
    const manifest = readManifest(file);
    let touched = 0;

    for (const event of manifest.events) {
      const image = resolved.get(event.id);
      if (!image) {
        continue;
      }
      event.imageUrl = image.imageUrl;
      event.imageCredit = image.imageCredit;
      event.imageSourceUrl = image.imageSourceUrl;
      event.imageAspect = image.imageAspect;
      event.wikiTitle = image.wikiTitle;
      touched++;
    }

    manifestSchema.parse(manifest);
    writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Wrote ${touched} event(s) → ${path.relative(process.cwd(), file)}`);
  }

  console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${failed} failed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
