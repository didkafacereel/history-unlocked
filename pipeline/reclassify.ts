/**
 * Re-derive the locally-computed fields over the database, in place.
 *
 *   npx tsx pipeline/reclassify.ts [--dry]
 *
 * Categories and card facts are both pure text work over data we already
 * stored, so improving a rule never has to cost network calls or rate-limit
 * budget — just redo it against `title` and `summary`. Instant and free.
 *
 * Only lite entries are touched. Events with an authored quiz came from the
 * language model, which wrote their copy and picked their category
 * deliberately; a keyword rule must not overrule that.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { manifestSchema } from '../src/data/manifest/schema';
import { categoryFor, factsFromText, sensitivityFor } from './lite';

/** Mirrors the icons the lite builder assigns per category. */
const ICONS: Record<string, string> = {
  'Military & Conflict': '⚔️',
  'Politics & Power': '🏛️',
  'Science & Technology': '🔬',
  'Exploration & Discovery': '🧭',
  'Culture & Ideas': '🎭',
  'Society & Rights': '✊',
  'Disaster & Tragedy': '🌋',
  'Sports & Games': '🏆',
  'Nations & Empires': '🗿',
};

const DB_PATH = path.resolve('pipeline/events-db.json');
const dry = process.argv.includes('--dry');

const db = manifestSchema.parse(JSON.parse(readFileSync(DB_PATH, 'utf8')));

let changed = 0;
let factsImproved = 0;
let toneChanged = 0;

for (const event of db.events) {
  // Tone is derived for EVERY event, authored ones included: the celebration
  // rules it drives are the app's, not the writer's, and an authored massacre
  // needs the confetti silenced just as much as a quoted one.
  const tone = sensitivityFor(`${event.title} ${event.summary ?? ''}`);
  if (tone !== (event.sensitivity ?? 'standard')) {
    event.sensitivity = tone;
    toneChanged++;
  }

  if (event.quizPool.length > 0) {
    continue;
  }

  // The stored title is the trimmed feed sentence, which is what the rules read.
  const next = categoryFor(`${event.title} ${event.summary ?? ''}`);
  if (next !== event.category) {
    event.category = next;
    changed++;
  }

  // Re-split the stored prose with the current fact rules.
  if (event.summary) {
    const rebuilt = factsFromText(event.summary, ICONS[next] ?? '📜');
    if (rebuilt.length > event.facts.length) {
      factsImproved++;
      event.facts = rebuilt;
    } else {
      // Same count, but keep the icon in sync with the (possibly new) category.
      event.facts = event.facts.map((f) => ({ ...f, icon: ICONS[next] ?? f.icon }));
    }
  }
}

const totals = new Map<string, number>();
for (const event of db.events) {
  const key = event.category ?? 'uncategorised';
  totals.set(key, (totals.get(key) ?? 0) + 1);
}

const singleFact = db.events.filter((e) => e.facts.length === 1).length;
const solemn = db.events.filter((e) => e.sensitivity === 'solemn').length;
console.log(
  `Reclassified ${changed} events · enriched facts on ${factsImproved} · ` +
    `${singleFact} still single-fact (of ${db.events.length}).`,
);
console.log(`Tone: ${toneChanged} changed · ${solemn} marked solemn.\n`);
console.log('Category totals:');
for (const [category, count] of [...totals.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(5)}  ${category}`);
}

if (dry) {
  console.log('\nDry run — nothing written.');
} else {
  const validated = manifestSchema.parse({ ...db, generatedAt: new Date().toISOString() });
  writeFileSync(DB_PATH, `${JSON.stringify(validated, null, 2)}\n`);
  console.log('\nWrote pipeline/events-db.json');
}
