/**
 * Print a date's lead event exactly as the app would open on it.
 *
 *   npx tsx scripts/day-lead.ts 09-24
 *
 * The video for a day has to be the SAME story the feed leads with, or the
 * reader who taps through from TikTok lands on something else and assumes the
 * link was wrong. So this goes through `planDeck`, the one place the app decides
 * the lead, rather than re-deriving "the strongest event" a second way.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { planDeck } from '../src/data/deckPlan';
import type { HistoricalEvent } from '../src/types/manifest';

const dateKey = process.argv[2];
if (!dateKey || !/^\d{2}-\d{2}$/.test(dateKey)) {
  console.error('Usage: npx tsx scripts/day-lead.ts MM-DD');
  process.exit(1);
}

const manifest = JSON.parse(
  readFileSync(path.resolve('docs/manifest.json'), 'utf8'),
) as { events: HistoricalEvent[] };

const day = manifest.events.filter((e) => e.dateKey === dateKey).sort((a, b) => a.year - b.year);
const plan = planDeck(day, { isPro: true, seen: {} });
const lead = plan.events[0];

if (!lead) {
  console.error(`No events on ${dateKey}.`);
  process.exit(1);
}

console.log(JSON.stringify({ lead, alternatives: plan.events.slice(1, 6).map((e) => ({ id: e.id, year: e.year, title: e.title, imageCredit: e.imageCredit })) }, null, 2));
