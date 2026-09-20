/**
 * Builds the launch screen's backdrop: a scatter of prints on a dark table.
 *
 * Every print is a real photograph or painting from the archive, of the event
 * it belongs to, under a public-domain licence. That constraint is the whole
 * point. The obvious way to make this picture is to ask an image model for
 * "vintage historical photographs scattered on a table", and the result is
 * beautiful and contains a fabricated Apollo 11, a fabricated warship and a
 * fabricated crowd. An app whose entire promise is that the picture matches the
 * event cannot put invented history on its front door; a reader who recognises
 * one fake has been given a reason to doubt the other 8055.
 *
 * Run: npm run pipeline:collage
 *
 * Writes assets/images/launch-backdrop.jpg and a credits file beside it. Both
 * are committed — this is not run at build time, and the app never sees it.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp, { type OverlayOptions } from 'sharp';

import { CORNERSTONES } from './cornerstones';
import { isSymbolImage } from './image-overrides';

// The package is CommonJS, so no `import.meta` and no top-level await. Scripts
// here are run from the repo root through an npm script, as the others are.
const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, 'docs', 'manifest.json');
const TABLE = path.join(ROOT, 'assets', 'source', 'collage-table.jpg');
const OUT = path.join(ROOT, 'assets', 'images', 'launch-backdrop.jpg');
const CREDITS = path.join(ROOT, 'assets', 'images', 'launch-backdrop.credits.md');
/** Downloaded originals, so a re-run is instant and offline. */
const CACHE = path.join(ROOT, '.cache', 'collage');

const USER_AGENT =
  'HistoryUnlockedBot/0.1 (History Unlocked educational app; launch backdrop builder)';

/** 2200 tall covers a 20:9 phone at 3x without upscaling on the long edge. */
const CANVAS = { width: 1240, height: 2200 };

interface ArchiveEvent {
  id: string;
  year: number;
  era: string;
  category?: string;
  title: string;
  sensitivity?: string;
  wikiTitle?: string;
  imageUrl?: string;
  imageCredit?: string;
  imageSourceUrl?: string;
  imageAspect?: number;
}

/**
 * Subjects that are not wallpaper.
 *
 * `sensitivity: 'solemn'` already carries most of this — the archive marks 629
 * events that way and they are excluded wholesale. This is the second line,
 * for anything the classifier let through, because the cost of it being wrong
 * once is a death camp used as decoration on a launch screen.
 */
const NOT_DECORATION =
  /auschwitz|holocaust|genocide|massacre|lynch|atrocity|famine|pogrom|internment|slave|execution|hanging|guillotine|gas attack|nerve agent|terror attack|september 11|9\/11|assassination|funeral|mass grave|refugee|epidemic|pandemic|plague/i;

/**
 * Documents whose interesting region is a crest.
 *
 * `isSymbolImage` passes these because the file is a photograph of a treaty,
 * not a logo — and it is right to. The problem is downstream: prints are
 * cropped with sharp's `attention` strategy, which finds the most salient
 * region, and on a page of uniform typescript that is the emblem at the top.
 * The NATO treaty's authentication page came out as a NATO roundel, the one
 * thing on this table that looked like a brand.
 */
const SIGNATURE_PAGE = /authenticationpage|treatycopy|signature[_ ]?page|title[_ ]?page/i;

function seeded(seed: string): () => number {
  // Deterministic, so the same archive always yields the same picture and a
  // rebuild is a no-op in git rather than a 300 KB diff of nothing.
  let h = parseInt(createHash('sha256').update(seed).digest('hex').slice(0, 13), 16);
  return () => {
    h = (h * 16807) % 2147483647;
    return h / 2147483647;
  };
}

function pickPrints(events: ArchiveEvent[], count: number): ArchiveEvent[] {
  const cornerstoneTitles = new Set(CORNERSTONES.map((c) => c.wikiTitle));

  const usable = events.filter(
    (e) =>
      e.imageUrl !== undefined &&
      e.wikiTitle !== undefined &&
      cornerstoneTitles.has(e.wikiTitle) &&
      /public domain/i.test(e.imageCredit ?? '') &&
      (e.imageAspect ?? 0) >= 1.1 &&
      e.sensitivity === 'standard' &&
      e.category !== 'Disaster & Tragedy' &&
      !NOT_DECORATION.test(`${e.title} ${e.wikiTitle}`) &&
      !isSymbolImage(e.imageUrl) &&
      !SIGNATURE_PAGE.test(e.imageUrl),
  );

  // One print per SUBJECT, not per picture. Deduplicating on imageUrl alone
  // was not enough: Voyager 1 owns four cornerstone dates — the launch, the
  // volcanoes on Io, Jupiter's rings and interstellar space — each with its own
  // NASA photograph, so the table came out with four Voyagers on it.
  const seen = new Set<string>();
  const unique = usable.filter((e) => {
    const key = e.wikiTitle ?? e.imageUrl ?? '';
    if (seen.has(key) || seen.has(e.imageUrl ?? '')) {
      return false;
    }
    seen.add(key);
    seen.add(e.imageUrl ?? '');
    return true;
  });

  // Round-robin across categories so the table is not forty battles. Military
  // & Conflict is half the cornerstone pool on its own; taking the top N by any
  // single score would bury everything else.
  const byCategory = new Map<string, ArchiveEvent[]>();
  for (const e of unique.sort((a, b) => a.year - b.year)) {
    const key = e.category ?? 'Other';
    byCategory.set(key, [...(byCategory.get(key) ?? []), e]);
  }
  const queues = [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);

  const chosen: ArchiveEvent[] = [];
  for (let round = 0; chosen.length < count && round < 100; round += 1) {
    for (const queue of queues) {
      const next = queue[round];
      if (next !== undefined && chosen.length < count) {
        chosen.push(next);
      }
    }
  }
  return chosen;
}

async function fetchImage(url: string): Promise<Buffer> {
  await mkdir(CACHE, { recursive: true });
  const cached = path.join(CACHE, `${createHash('sha1').update(url).digest('hex')}.bin`);
  try {
    return await readFile(cached);
  } catch {
    // Not cached yet.
  }
  const res = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(cached, buf);
  return buf;
}

/** One photographic print: cropped, bordered, aged slightly, tilted. */
async function makePrint(image: Buffer, width: number, angle: number): Promise<Buffer> {
  const height = Math.round(width / 1.36);
  const border = Math.round(width * 0.035);

  // NOT sharp's `.tint()`. That desaturates to greyscale before applying the
  // hue, so a warm tint over twenty-eight pictures produced one flat grey
  // sheet — the Model T, the Jupiter rings and the March on Washington all the
  // same colour. Saturation is pulled down instead, and the warmth comes from
  // a translucent wash composited on top, which leaves the original hues under
  // it.
  const photo = await sharp(image)
    .resize(width, height, { fit: 'cover', position: 'attention' })
    .modulate({ saturation: 0.74 })
    .composite([
      {
        input: {
          create: {
            width,
            height,
            channels: 4,
            background: { r: 255, g: 226, b: 176, alpha: 0.14 },
          },
        },
        blend: 'over',
      },
    ])
    .toBuffer();

  return sharp(photo)
    .extend({
      top: border,
      left: border,
      right: border,
      // A print is signed and dated on the bottom margin, so it is deeper.
      bottom: Math.round(border * 1.9),
      background: { r: 236, g: 228, b: 209, alpha: 1 },
    })
    .rotate(angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/** A soft black silhouette of a print, to sit under it. */
async function makeShadow(print: Buffer): Promise<Buffer> {
  const { width = 0, height = 0 } = await sharp(print).metadata();
  // The alpha channel of the rotated print IS the shape of the shadow, tilt
  // included. Blurred, it is the only thing separating one print from the one
  // underneath: without it twenty-eight overlapping rectangles read as tiling
  // rather than as a pile.
  const alpha = await sharp(print).extractChannel(3).linear(0.82, 0).toBuffer();
  return sharp({
    create: { width, height, channels: 3, background: { r: 0, g: 0, b: 0 } },
  })
    .joinChannel(alpha)
    .blur(18)
    .png()
    .toBuffer();
}

async function main(): Promise<void> {
  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8')) as { events: ArchiveEvent[] };

  // 4 across and 7 down, overlapping. More than this and each print is too
  // small to be a picture of anything; fewer and the table looks tidy, which
  // is the opposite of the feeling wanted.
  const columns = 4;
  const rows = 7;
  const chosen = pickPrints(manifest.events, columns * rows);
  if (chosen.length < columns * rows) {
    throw new Error(`only ${chosen.length} prints passed the filters, wanted ${columns * rows}`);
  }
  console.log(`${chosen.length} prints selected`);

  const table = await sharp(TABLE)
    .resize(CANVAS.width, CANVAS.height, { fit: 'cover' })
    // Blurred past legibility on purpose. The table this came from is a
    // generated image and its own "photographs" are invented; at radius 60 it
    // is wood grain and lamplight and makes no claim about anything.
    .blur(60)
    .modulate({ brightness: 0.34, saturation: 0.7 })
    .toBuffer();

  const rand = seeded('launch-backdrop-v1');
  const layers: OverlayOptions[] = [];
  const used: ArchiveEvent[] = [];

  // Step is smaller than the print, which is what makes them overlap; the
  // bleed lets the outer ring run off every edge so the scatter has no border.
  const stepX = CANVAS.width / (columns - 0.55);
  const stepY = CANVAS.height / (rows - 0.55);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const event = chosen[row * columns + column];
      if (event?.imageUrl === undefined) {
        continue;
      }
      const width = Math.round(stepX * (1.0 + rand() * 0.34));
      const angle = (rand() - 0.5) * 44;

      let print: Buffer;
      try {
        print = await makePrint(await fetchImage(event.imageUrl), width, angle);
      } catch (error) {
        console.warn(`skipped ${event.id}: ${String(error)}`);
        continue;
      }
      const shadow = await makeShadow(print);

      const left = Math.round(column * stepX - stepX * 0.34 + (rand() - 0.5) * stepX * 0.52);
      const top = Math.round(row * stepY - stepY * 0.34 + (rand() - 0.5) * stepY * 0.52);

      layers.push({ input: shadow, left: left + 14, top: top + 20 });
      layers.push({ input: print, left, top });
      used.push(event);
      console.log(`  ${event.year} — ${event.title.slice(0, 64)}`);

      // Nothing is gained by hammering Wikimedia; the cache makes this a
      // one-time cost anyway.
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  }

  const scattered = await sharp(table).composite(layers).toBuffer();

  // The last pass is the one that makes it usable as a BACKDROP rather than a
  // picture: dark enough that white text sits on it at full contrast, and a
  // vignette so nothing at the edges competes with the tiles.
  const veil = Buffer.from(
    `<svg width="${CANVAS.width}" height="${CANVAS.height}" xmlns="http://www.w3.org/2000/svg">
       <defs>
         <radialGradient id="v" cx="50%" cy="38%" r="78%">
           <stop offset="0%" stop-color="#06070A" stop-opacity="0.22"/>
           <stop offset="55%" stop-color="#06070A" stop-opacity="0.50"/>
           <stop offset="100%" stop-color="#06070A" stop-opacity="0.86"/>
         </radialGradient>
       </defs>
       <rect width="100%" height="100%" fill="url(#v)"/>
     </svg>`,
  );

  await sharp(scattered)
    .composite([{ input: veil }])
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(OUT);

  const lines = [
    '# Launch backdrop — sources',
    '',
    'Every print in `launch-backdrop.jpg` is an image from the archive, of the',
    'event it belongs to, in the public domain. Rebuild with',
    '`npm run pipeline:collage`.',
    '',
    ...used.map(
      (e) => `- **${e.year} — ${e.title}**\n  ${e.imageCredit ?? ''}\n  ${e.imageSourceUrl ?? ''}`,
    ),
    '',
    'The table surface underneath is a generated texture, blurred past',
    'legibility; it depicts nothing.',
    '',
  ];
  await writeFile(CREDITS, lines.join('\n'), 'utf8');

  const { size } = await stat(OUT);
  console.log(`\nwrote ${path.relative(ROOT, OUT)} — ${Math.round(size / 1024)} KB`);
  console.log(`wrote ${path.relative(ROOT, CREDITS)} — ${used.length} sources`);
}

main();
