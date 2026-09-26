/**
 * Strip Wikipedia pronunciation leftovers from text already in the database.
 *
 * The REST extract keeps the punctuation and IPA of the pronunciation
 * templates, so lead cards opened "Roald Engelbregt Gravning Amundsen (UK: ,
 * US: ; Norwegian: [ˈrùːɑɫ ˈɑ̂mʉnsən] ; 16 July 1872…". `lite.ts` now cleans
 * the extract before anything is cut from it; these rows were written before.
 *
 * No network. Title, summary and every fact are cleaned in place with the same
 * `stripPronunciation`, so each fact keeps its split and its id — the pass only
 * ever removes markup, never re-cuts sentences. Authored events are included:
 * their facts and summary are the same quoted extract.
 *
 *   --plan    report what would change (default)
 *   --apply   write pipeline/events-db.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { manifestSchema } from '../src/data/manifest/schema';
import { stripPronunciation } from './lite';

const DB_PATH = path.resolve('pipeline/events-db.json');

function main(): void {
  const db = manifestSchema.parse(JSON.parse(readFileSync(DB_PATH, 'utf8')));

  let events = 0;
  let fields = 0;
  let facts = 0;

  for (const event of db.events) {
    const changes: string[] = [];
    const clean = (label: string, before: string): string => {
      const after = stripPronunciation(before);
      if (after !== before) {
        changes.push(`     ${label}\n       -  ${before.slice(0, 110)}\n       +  ${after.slice(0, 110)}`);
      }
      return after;
    };

    event.title = clean('title', event.title);
    if (event.summary) {
      event.summary = clean('summary', event.summary);
    }
    event.facts = event.facts.map((fact) => {
      const text = clean(fact.id, fact.text);
      if (text !== fact.text) facts++;
      return { ...fact, text };
    });

    if (changes.length > 0) {
      events++;
      fields += changes.length;
      console.log(`  ${event.id}\n${changes.join('\n')}`);
    }
  }

  console.log(`\n${events} events cleaned · ${fields} fields · ${facts} facts.`);

  if (!process.argv.includes('--apply')) {
    console.log('Nothing written. Re-run with --apply.');
    return;
  }
  const validated = manifestSchema.parse(db);
  writeFileSync(DB_PATH, `${JSON.stringify(validated, null, 2)}\n`);
  console.log(`Written to ${DB_PATH}.`);
}

main();
