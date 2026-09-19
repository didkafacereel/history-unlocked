/**
 * CI-style gate: run the exact runtime Zod schema against the JSON so a bad
 * manifest fails here, not on device.
 *
 * BOTH manifests, and the second one is the point. This script used to check
 * only the bundled seven-day fixture — 154 events — and report "MANIFEST
 * VALID" while the 8056-event archive that readers actually download was never
 * looked at. The published file is the one that can break the app in the wild.
 *
 * Usage: npx tsx scripts/validate-manifest.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { z } from 'zod';

import { manifestSchema, scenarioQuestionSchema } from '../src/data/manifest/schema';
import raw from '../src/data/manifest/sample-manifest.json';

let failed = false;

function report(label: string, json: unknown): void {
  const result = manifestSchema.safeParse(json);
  if (!result.success) {
    console.error(`${label} INVALID:`);
    for (const issue of result.error.issues.slice(0, 20)) {
      console.error(`  ${issue.path.join('.')} — ${issue.message}`);
    }
    if (result.error.issues.length > 20) {
      console.error(`  …and ${result.error.issues.length - 20} more`);
    }
    failed = true;
    return;
  }
  const events = result.data.events;
  const questions = events.reduce((n, e) => n + e.quizPool.length, 0);
  const days = new Set(events.map((e) => e.dateKey)).size;
  console.log(`${label} VALID: ${events.length} events, ${days} days, ${questions} questions`);
}

report('FIXTURE', raw);

const published = path.resolve('docs/manifest.json');
if (existsSync(published)) {
  report('ARCHIVE', JSON.parse(readFileSync(published, 'utf8')));
} else {
  console.warn('ARCHIVE SKIPPED: docs/manifest.json not built — run pipeline:publish');
}

/**
 * The quiz pools ship beside the manifest, not inside it. Without this the
 * archive line reports "0 questions" and is perfectly happy: the 6017 authored
 * pools could be missing, truncated or malformed and nothing would say so
 * until a reader opened a quiz and got the generated questions instead.
 */
const quizzesPath = path.resolve('docs/quizzes.json');
if (existsSync(quizzesPath)) {
  const parsed = z
    .object({ version: z.number(), quizzes: z.record(z.string(), z.array(scenarioQuestionSchema)) })
    .safeParse(JSON.parse(readFileSync(quizzesPath, 'utf8')));
  if (!parsed.success) {
    console.error('QUIZZES INVALID:');
    for (const issue of parsed.error.issues.slice(0, 20)) {
      console.error(`  ${issue.path.join('.')} — ${issue.message}`);
    }
    failed = true;
  } else {
    const pools = Object.values(parsed.data.quizzes);
    const questions = pools.reduce((n, p) => n + p.length, 0);
    console.log(`QUIZZES VALID: ${pools.length} pools, ${questions} questions`);
  }
} else {
  console.warn('QUIZZES SKIPPED: docs/quizzes.json not built — run pipeline:publish');
}

if (failed) {
  process.exit(1);
}
