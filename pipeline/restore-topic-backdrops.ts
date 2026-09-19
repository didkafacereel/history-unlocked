/**
 * Undo the one swap this project should never have made.
 *
 * The symbol pass has a strategy that takes a picture from further down the
 * event's OWN Wikipedia article, on the reasoning that the article is already
 * the correct subject. That holds for an article about one moment. It is false
 * for an article about a subject that ran for years: the other forty pictures
 * on "World War II" are other battles, on "The Troubles" other bombings, on
 * "Space Shuttle program" other missions. Handing one to each event bought
 * visual variety by printing a caption that is not true.
 *
 * What it actually shipped: the Auschwitz mugshot of Czesława Kwoka over the
 * Red Army's Operation Iskra, the League of Nations debating chamber over
 * Hitler entering the Führerbunker, a bar chart of war dead over the breaking
 * of the siege of Kobanî, and a 1995 crew portrait over Sally Ride's 1983
 * flight. Rule 6 says every image depicts its own event; a shared but honest
 * backdrop beats a unique invented one, so these go back to the picture the
 * rest of their topic carries.
 *
 *   --plan    list every change, write nothing
 *   --apply   write them to pipeline/events-db.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { manifestSchema } from '../src/data/manifest/schema';
import type { HistoricalEvent } from '../src/types/manifest';
import { IMAGE_OVERRIDES } from './image-overrides';

const DB_PATH = path.resolve('pipeline/events-db.json');

/** Below this an article is about one moment, and its images are that moment. */
const GROUP_MIN = 3;
/** A subject that outlives this many years is a topic, not an event. */
const SPAN_MAX = 5;
/**
 * How many events must share a picture before it counts as the article's lead.
 *
 * Two is not enough, and assuming it was inverted three repairs into damage:
 * "Palestinians" carries the flag on one event and a photograph of Arafat on
 * two, so the majority test named Arafat the lead and offered to put him on a
 * 2006 bombing, two years after his death. Same for the FDA seal and for the
 * portrait of Martin Luther King on the bill that created his holiday. Below
 * this line the group is too small to tell a lead image from a bad swap, so
 * nothing is touched.
 */
const LEAD_MIN = 3;

type Change = {
  event: HistoricalEvent;
  from: string;
  to: HistoricalEvent;
  article: string;
};

function planChanges(events: HistoricalEvent[]): Change[] {
  const curated = new Set(IMAGE_OVERRIDES.map((o) => o.eventId));

  const byTitle = new Map<string, HistoricalEvent[]>();
  for (const event of events) {
    if (!event.wikiTitle) {
      continue;
    }
    const list = byTitle.get(event.wikiTitle) ?? [];
    list.push(event);
    byTitle.set(event.wikiTitle, list);
  }

  const changes: Change[] = [];
  for (const [article, list] of byTitle) {
    if (list.length < GROUP_MIN) {
      continue;
    }
    const years = list.map((e) => e.year);
    if (Math.max(...years) - Math.min(...years) <= SPAN_MAX) {
      continue;
    }

    const counts = new Map<string, number>();
    for (const event of list) {
      counts.set(event.imageUrl, (counts.get(event.imageUrl) ?? 0) + 1);
    }
    // The picture most of the topic carries is the article's lead image, which
    // is what every event here had before one of them was singled out.
    let lead: HistoricalEvent | null = null;
    let best = LEAD_MIN - 1;
    for (const event of list) {
      const n = counts.get(event.imageUrl) ?? 0;
      if (n > best) {
        best = n;
        lead = event;
      }
    }
    if (!lead) {
      continue; // No shared picture to go back to; leave the topic alone.
    }

    for (const event of list) {
      if ((counts.get(event.imageUrl) ?? 0) > 1) {
        continue; // Already on the shared backdrop.
      }
      if (curated.has(event.id)) {
        continue; // Chosen by hand, with a written reason. Those stay.
      }
      changes.push({ event, from: event.imageUrl, to: lead, article });
    }
  }
  return changes;
}

function fileOf(url: string): string {
  try {
    return decodeURIComponent(url.split('/').pop() ?? url);
  } catch {
    return url.split('/').pop() ?? url;
  }
}

function main(): void {
  const parsed = manifestSchema.parse(JSON.parse(readFileSync(DB_PATH, 'utf8')));
  const events = parsed.events;
  const changes = planChanges(events);

  const byArticle = new Map<string, Change[]>();
  for (const change of changes) {
    const list = byArticle.get(change.article) ?? [];
    list.push(change);
    byArticle.set(change.article, list);
  }
  for (const [article, list] of [...byArticle.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n## ${article}  (${list.length})`);
    for (const change of list) {
      console.log(`  ${change.event.year} ${change.event.title.slice(0, 62)}`);
      console.log(`     off: ${fileOf(change.from)}`);
      console.log(`     on : ${fileOf(change.to.imageUrl)}`);
    }
  }
  console.log(`\n${changes.length} events across ${byArticle.size} topics.`);

  if (!process.argv.includes('--apply')) {
    console.log('Nothing written. Re-run with --apply.');
    return;
  }

  for (const { event, to } of changes) {
    event.imageUrl = to.imageUrl;
    event.imageCredit = to.imageCredit;
    event.imageSourceUrl = to.imageSourceUrl;
    event.imageAspect = to.imageAspect;
  }
  writeFileSync(DB_PATH, `${JSON.stringify({ ...parsed, events }, null, 2)}\n`);
  console.log(`Written to ${DB_PATH}.`);
}

main();
