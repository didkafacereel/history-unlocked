/**
 * Tidy the headlines that were cut badly.
 *
 * `titleFromSummary` used to cut at a comma without looking at what it was
 * cutting through, which left 51 titles carrying an opening bracket with no
 * partner and a handful stopping on a conjunction. The generator is fixed;
 * these rows were written before the fix.
 *
 * They are TIDIED IN PLACE, not regenerated. Recomputing was tried first and
 * was much worse: `summary` holds the Wikipedia article's lead, not the day's
 * event, so re-cutting turned "Francisco Pizarro founded Ciudad de los Reyes"
 * into "Francisco Pizarro, 1st Marquess of the Conquest, was a Spanish
 * conquistador" — an encyclopedia definition in place of something that
 * happened. The words already on the card are the right words; only the cut
 * was wrong.
 *
 *   --plan    list the changes (default)
 *   --apply   write pipeline/events-db.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { manifestSchema } from '../src/data/manifest/schema';
import type { HistoricalEvent } from '../src/types/manifest';

const DB_PATH = path.resolve('pipeline/events-db.json');

/**
 * Lower case only, and that is not a stylistic choice.
 *
 * Case-insensitively, this pattern ate the "A" from "Israeli forces seized
 * MV Karine A" — the ship's name — because "a" is an article. A trailing
 * capital is far more likely to be part of a name or a designation than a
 * word the sentence was going to continue with.
 */
const DANGLING =
  /\s+(and|or|but|nor|the|a|an|of|in|on|at|to|from|with|by|for|as|its|his|her|their|our|into|onto|which|that|whose|than)$/;

function unbalanced(text: string): boolean {
  const count = (ch: string) => text.split(ch).length - 1;
  return count('(') !== count(')') || count('[') !== count(']');
}

function isBroken(title: string): boolean {
  const t = title.trim();
  return unbalanced(t) || /[,;:]$/.test(t) || DANGLING.test(t);
}

/** Same rules as `tidyCut` in lite.ts, applied to a finished title. */
function tidy(title: string): string {
  let out = title.trim().replace(/…$/, '');

  for (const [open, close] of [
    ['(', ')'],
    ['[', ']'],
  ] as const) {
    let depth = 0;
    let openedAt = -1;
    for (let i = 0; i < out.length; i++) {
      if (out[i] === open) {
        if (depth === 0) openedAt = i;
        depth++;
      } else if (out[i] === close) {
        depth = Math.max(0, depth - 1);
        if (depth === 0) openedAt = -1;
      }
    }
    if (depth > 0 && openedAt >= 0) {
      out = out.slice(0, openedAt).trim();
    }
    // A stray closer with nothing opening it — drop the character, keep the words.
    if (depth === 0 && (out.split(open).length - 1) !== (out.split(close).length - 1)) {
      out = out.split(close).join('').trim();
    }
  }

  out = out.replace(/[,;:–—-]+$/, '').trim();
  while (DANGLING.test(out)) {
    out = out.replace(DANGLING, '').replace(/[,;:]+$/, '');
  }
  return out.trim();
}

function main(): void {
  const parsed = manifestSchema.parse(JSON.parse(readFileSync(DB_PATH, 'utf8')));
  const events: HistoricalEvent[] = parsed.events;

  const changes: { event: HistoricalEvent; from: string; to: string }[] = [];
  const stuck: HistoricalEvent[] = [];

  for (const event of events) {
    if (!isBroken(event.title)) {
      continue;
    }
    const next = tidy(event.title);
    // Ten, not fifteen: "The Long March" and "Kristallnacht" are both complete
    // headlines and both were rejected by a higher floor.
    if (!next || next.length < 10 || isBroken(next)) {
      stuck.push(event);
      continue;
    }
    changes.push({ event, from: event.title, to: next });
  }

  for (const { event, from, to } of changes) {
    console.log(`${event.id}\n   -  ${from}\n   +  ${to}`);
  }
  console.log(`\n${changes.length} repaired, ${stuck.length} left alone.`);
  for (const e of stuck) {
    console.log(`   STUCK ${e.id}: ${e.title}`);
  }

  if (!process.argv.includes('--apply')) {
    console.log('Nothing written. Re-run with --apply.');
    return;
  }
  for (const { event, to } of changes) {
    event.title = to;
  }
  writeFileSync(DB_PATH, `${JSON.stringify({ ...parsed, events }, null, 2)}\n`);
  console.log(`Written to ${DB_PATH}.`);
}

main();
