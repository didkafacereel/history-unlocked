/**
 * Re-cut the facts that were cut badly, from the prose already on the event.
 *
 * 30% of the archive's facts ended in an ellipsis and 44% of its titles did,
 * because `FACT_MAX` was 160 and the only clause boundary inside that window
 * frequently fell before the sentence's main verb. `lite.ts` is fixed; these
 * rows were written before the fix.
 *
 * No network. Every event carries its source prose in `summary` — 8051 of
 * 8056, and every truncated event has one — so the split can simply be run
 * again against the same text that produced it.
 *
 * Only events with a truncated fact are touched, and a rebuilt set is kept
 * only when it is at least as good: never fewer facts, never more ellipses.
 * A rule that improves the average while quietly emptying some cards is not
 * an improvement.
 *
 *   --plan    report what would change (default)
 *   --apply   write pipeline/events-db.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { manifestSchema } from '../src/data/manifest/schema';
import type { FactBlock, HistoricalEvent } from '../src/types/manifest';
import { factsFromText } from './lite';

const DB_PATH = path.resolve('pipeline/events-db.json');

const truncated = (facts: readonly FactBlock[]) => facts.filter((f) => f.text.endsWith('…')).length;

function main(): void {
  const parsed = manifestSchema.parse(JSON.parse(readFileSync(DB_PATH, 'utf8')));
  const events: HistoricalEvent[] = parsed.events;

  let improved = 0;
  let refused = 0;
  let ellipsesBefore = 0;
  let ellipsesAfter = 0;
  const samples: string[] = [];

  for (const event of events) {
    const before = event.facts;
    ellipsesBefore += truncated(before);
    if (truncated(before) === 0 || !event.summary) {
      ellipsesAfter += truncated(before);
      continue;
    }

    // The icon the card already uses: this pass re-cuts sentences, it does not
    // re-categorise. That is reclassify.ts's job.
    const after = factsFromText(event.summary, before[0]?.icon ?? '📜');
    // Never trade content for tidiness.
    if (after.length < before.length || truncated(after) > truncated(before)) {
      refused++;
      ellipsesAfter += truncated(before);
      continue;
    }
    ellipsesAfter += truncated(after);
    if (samples.length < 6 && truncated(after) < truncated(before)) {
      samples.push(`  ${event.year} ${event.title.slice(0, 44)}\n     -  ${before[0]?.text.slice(0, 96)}\n     +  ${after[0]?.text.slice(0, 96)}`);
    }
    event.facts = after;
    improved++;
  }

  for (const s of samples) console.log(s);
  console.log(
    `\n${improved} events re-cut, ${refused} left alone (rebuild was not better).` +
      `\nFacts ending in an ellipsis: ${ellipsesBefore} -> ${ellipsesAfter}`,
  );

  if (!process.argv.includes('--apply')) {
    console.log('Nothing written. Re-run with --apply.');
    return;
  }
  writeFileSync(DB_PATH, `${JSON.stringify({ ...parsed, events }, null, 2)}\n`);
  console.log(`Written to ${DB_PATH}.`);
}

main();
