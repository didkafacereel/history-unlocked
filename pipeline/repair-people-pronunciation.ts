/**
 * Strip Wikipedia pronunciation leftovers from the day register.
 *
 * The same markup as in the events (see repair-pronunciation.ts): the extract
 * keeps the punctuation and IPA of the pronunciation templates, so a person's
 * sheet opened "Lorenzo di Piero de' Medici (Italian: [loˈrɛntso de
 * ˈmɛːditʃi]), known as…". `people.ts` now cleans the extract before it is
 * trimmed; these rows were written before.
 *
 * No network. Each stored summary is cleaned with the same `stripPronunciation`.
 * A summary already trimmed at MAX_SUMMARY stays trimmed where it was — the
 * pass only removes markup, never re-cuts sentences.
 *
 * The plan prints only what each summary loses, not the whole text, so every
 * change can be read.
 *
 *   --plan    report what would change (default)
 *   --apply   write pipeline/people-db.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { dayRegisterSchema } from '../src/data/manifest/schema';
import { stripPronunciation } from './lite';

const DB_PATH = path.resolve('pipeline/people-db.json');
const registerFileSchema = z.object({
  generatedAt: z.string(),
  register: z.array(dayRegisterSchema),
});

/**
 * "-[…] +[…]" for each run that differs. The cleaner deletes, and at most turns
 * a separator into a comma, so a character LCS is exact and cheap at 480 chars.
 */
function changedRuns(before: string, after: string): string {
  const n = before.length;
  const m = after.length;
  const lcs = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i]![j] =
        before[i] === after[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }
  const runs: string[] = [];
  let removed = '';
  let added = '';
  const flush = () => {
    if (removed || added) runs.push(`${removed ? `-[${removed}]` : ''}${added ? `+[${added}]` : ''}`);
    removed = '';
    added = '';
  };
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && before[i] === after[j]) {
      flush();
      i++;
      j++;
    } else if (j >= m || (i < n && lcs[i + 1]![j]! >= lcs[i]![j + 1]!)) {
      removed += before[i++];
    } else {
      added += after[j++];
    }
  }
  flush();
  return runs.join('  ');
}

function main(): void {
  const file = registerFileSchema.parse(JSON.parse(readFileSync(DB_PATH, 'utf8')));

  let people = 0;
  let cleaned = 0;

  for (const day of file.register) {
    for (const person of [...day.births, ...day.deaths]) {
      people++;
      if (!person.summary) continue;
      const after = stripPronunciation(person.summary);
      if (after === person.summary) continue;
      cleaned++;
      console.log(`  ${day.dateKey} ${person.name}\n     ${changedRuns(person.summary, after)}`);
      person.summary = after;
    }
  }

  console.log(`\n${cleaned} of ${people} summaries cleaned.`);

  if (!process.argv.includes('--apply')) {
    console.log('Nothing written. Re-run with --apply.');
    return;
  }
  // generatedAt is left alone: nothing was fetched, so the register is as old
  // as it was.
  const validated = registerFileSchema.parse(file);
  writeFileSync(DB_PATH, `${JSON.stringify(validated, null, 2)}\n`);
  console.log(`Written to ${DB_PATH}.`);
}

main();
