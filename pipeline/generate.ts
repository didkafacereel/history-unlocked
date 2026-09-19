/**
 * Daily manifest + imagery generator.
 *
 *   npx tsx pipeline/generate.ts [--date MM-DD] [--out docs] [--base-url URL] [--force]
 *
 * Reads pipeline/events-db.json (the master event database), generates one
 * image per event for the requested date, and emits a manifest.json that has
 * ALREADY passed the app's own Zod schema — the pipeline cannot publish what
 * the app would reject.
 *
 * Idempotent: existing images are kept unless --force, so a cron re-run only
 * pays for what is missing.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { manifestSchema } from '../src/data/manifest/schema';
import { todayDateKey } from '../src/lib/dateKey';
import eventsDb from './events-db.json';
import { buildImagePrompt, seedFor } from './prompt';
import { activeProviderName, generateImage } from './providers';

const IMAGE_WIDTH = 768;
const IMAGE_HEIGHT = 1344; // 9:16, sized for full-screen phone backdrops

function readArg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value && !value.startsWith('--') ? value : null;
}

async function main(): Promise<void> {
  const dateKey = readArg('--date') ?? todayDateKey();
  const outDir = path.resolve(readArg('--out') ?? 'docs');
  const baseUrl = (
    readArg('--base-url') ??
    process.env.PUBLIC_BASE_URL ??
    'https://example.github.io/history-unlocked'
  ).replace(/\/$/, '');
  const force = process.argv.includes('--force');

  // Gate the DB through the same schema the app enforces at ingestion.
  const db = manifestSchema.parse(eventsDb);
  const forDate = db.events.filter((e) => e.dateKey === dateKey);
  const events = forDate.length > 0 ? forDate : db.events;
  if (forDate.length === 0) {
    console.warn(`! No events for ${dateKey} in events-db.json — generating for all ${events.length} events instead.`);
  }

  const imagesDir = path.join(outDir, 'images');
  mkdirSync(imagesDir, { recursive: true });
  console.log(`Generating ${events.length} event image(s) for ${dateKey} via ${activeProviderName()}`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const event of events) {
    const filePath = path.join(imagesDir, `${event.id}.jpg`);

    if (existsSync(filePath) && !force) {
      skipped++;
      continue;
    }

    const request = {
      prompt: buildImagePrompt(event),
      seed: seedFor(event.id),
      width: IMAGE_WIDTH,
      height: IMAGE_HEIGHT,
    };

    try {
      let buffer: Buffer;
      try {
        buffer = await generateImage(request);
      } catch (firstError) {
        console.warn(`  retrying ${event.id}: ${String(firstError)}`);
        buffer = await generateImage(request);
      }
      writeFileSync(filePath, buffer);
      generated++;
      console.log(`  ✓ ${event.id} (${Math.round(buffer.length / 1024)} KB)`);
    } catch (error) {
      // Resilient cron: a single failed render keeps the event's existing
      // (placeholder or previous) imageUrl rather than sinking the whole day.
      failed++;
      console.error(`  ✗ ${event.id}: ${String(error)} — keeping existing imageUrl`);
    }
  }

  // The served manifest is the FULL archive — every event in the database, so
  // the app's Time Machine can load any date. Each event points at its
  // generated image when one exists on disk, otherwise its original URL.
  const archiveEvents = db.events.map((event) =>
    existsSync(path.join(imagesDir, `${event.id}.jpg`))
      ? { ...event, imageUrl: `${baseUrl}/images/${event.id}.jpg` }
      : event,
  );

  const manifest = manifestSchema.parse({
    version: 1,
    generatedAt: new Date().toISOString(),
    events: archiveEvents,
  });
  writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const coveredDates = new Set(archiveEvents.map((e) => e.dateKey)).size;
  console.log(
    `Done: ${generated} generated, ${skipped} reused, ${failed} failed. ` +
      `Archive: ${archiveEvents.length} events across ${coveredDates} dates → ${path.join(outDir, 'manifest.json')}`,
  );
  if (failed > 0 && generated === 0 && skipped === 0) {
    process.exit(1); // nothing usable was produced — fail the cron loudly
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
