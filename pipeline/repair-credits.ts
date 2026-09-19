/**
 * Tidy the attribution lines that came back as prose.
 *
 * Commons' `Artist` field is free text, and for 183 events it holds the
 * uploader's notes rather than a name: "Unclear. There are six photographs on
 * the page …", "Series: Reagan White House Photographs, 1/20/1981 …", plus
 * wiki debris like "Luna_1.jpg : " prefixes and "derivative work: Craigboy
 * ( talk )" suffixes. Printed under a card, that is a paragraph, not a credit.
 *
 * DELIBERATELY TIMID, because the first version of this script was not and it
 * broke the licence. It shortened "Alexander Mokletsov · CC BY-SA 3.0" to
 * "CC BY-SA 3.0", and CC BY-SA is precisely the licence that REQUIRES the
 * author be named — dropping him is not untidiness, it is using the photograph
 * without permission. So:
 *
 *   - the licence half is never altered;
 *   - an author is never dropped from a licence that demands attribution;
 *   - nothing is ever cut mid-phrase — long and correct beats short and wrong;
 *   - prose is replaced by the licence alone ONLY under public domain, where no
 *     attribution is owed and there was no author named to begin with.
 *
 *   --plan    list the changes (default)
 *   --apply   write pipeline/events-db.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { manifestSchema } from '../src/data/manifest/schema';
import type { HistoricalEvent } from '../src/types/manifest';

const DB_PATH = path.resolve('pipeline/events-db.json');

/** Licences that oblige us to name the author. */
const NEEDS_ATTRIBUTION = /\bCC\b|creative commons|attribution|GFDL|BY-SA|BY-NC|BY\b/i;

/**
 * Openings that announce archival notes rather than an author.
 *
 * "Unknown author" and "Unknown photographer" are NOT here. They read as
 * credits and they tell the reader something true — that nobody knows who took
 * the picture. An earlier pattern matched a bare `unknown\b` and quietly
 * replaced 600 of them with the bare licence, losing that.
 */
const NOT_A_NAME =
  /^(unclear\b|note:|series:|collection:|this (vector )?(image|file|work)\b|the original uploader\b|original work by\b|vector file created by\b|see\b)/i;

/** Strip wiki debris without touching the words that name a person. */
function cleanArtist(artist: string): string {
  return artist
    .replace(/\s+/g, ' ')
    // "Luna_1.jpg : Alexander Mokletsov" — the filename is not the author. The
    // name may carry its "File:" namespace and may contain spaces, as in
    // "File:Operation Just Cause.png : LLs".
    .replace(/^(?:file:)?[^:]+?\.(?:jpe?g|png|gif|svg|tiff?|webp)\s*:\s*/i, '')
    // "… derivative work: Craigboy ( talk )" — the editor, not the author.
    .replace(/\s*derivative work\s*:.*$/i, '')
    .replace(/\s*\(\s*talk\s*\)/gi, '')
    .replace(/\[\d+\]/g, '')
    // A separator left hanging by one of the removals above: stripping
    // "derivative work: …" off "Happenstance et al / derivative work: Danlaycock"
    // otherwise ends the credit on a bare slash.
    .replace(/\s*[,;·|/&+-]+\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function main(): void {
  const parsed = manifestSchema.parse(JSON.parse(readFileSync(DB_PATH, 'utf8')));
  const events: HistoricalEvent[] = parsed.events;

  const changes: { event: HistoricalEvent; from: string; to: string; why: string }[] = [];

  for (const event of events) {
    const credit = event.imageCredit;
    if (!credit) {
      continue;
    }
    const parts = credit.split(' · ');
    if (parts.length < 2) {
      continue; // No "<artist> · <licence>" shape; leave it exactly as it is.
    }
    const licence = parts[parts.length - 1] ?? '';
    const artist = parts.slice(0, -1).join(' · ');

    const cleaned = cleanArtist(artist);

    let next: string | null = null;
    let why = '';
    if (cleaned && cleaned !== artist) {
      next = `${cleaned} · ${licence}`;
      why = 'wiki debris removed';
    }
    // Prose with no author in it, under a licence that owes nobody a credit.
    if ((!cleaned || NOT_A_NAME.test(cleaned)) && !NEEDS_ATTRIBUTION.test(licence)) {
      next = licence;
      why = 'uploader notes, public domain';
    }

    if (next && next !== credit) {
      changes.push({ event, from: credit, to: next, why });
    }
  }

  for (const c of changes.slice(0, 25)) {
    console.log(`${c.event.id}  (${c.why})\n   -  ${c.from}\n   +  ${c.to}`);
  }
  const kept = changes.filter((c) => NEEDS_ATTRIBUTION.test(c.to));
  console.log(`\n${changes.length} credits tidied · ${kept.length} of them under a licence that names an author (all kept).`);

  if (!process.argv.includes('--apply')) {
    console.log('Nothing written. Re-run with --apply.');
    return;
  }
  for (const { event, to } of changes) {
    event.imageCredit = to;
  }
  writeFileSync(DB_PATH, `${JSON.stringify({ ...parsed, events }, null, 2)}\n`);
  console.log(`Written to ${DB_PATH}.`);
}

main();
