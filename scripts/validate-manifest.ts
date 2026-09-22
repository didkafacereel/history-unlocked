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

import { planDeck } from '../src/data/deckPlan';
import { manifestSchema, scenarioQuestionSchema } from '../src/data/manifest/schema';
import { questionsFor } from '../src/data/quizGeneration';
import { dailyQuestionCount } from '../src/stores/useQuizStore';
import type { HistoricalEvent, ScenarioQuestion } from '../src/types/manifest';
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
  reportInsecureUrls(label, events);
}

/**
 * Every URL the app fetches must be https, and nothing enforced it.
 *
 * The archive is clean today — swept, 0 of 8,056 — but a pipeline run is what
 * writes these, and one `http://` from an upstream source would ship silently.
 * Android release builds disable cleartext traffic, so the failure on a phone
 * is not an error message: it is a card with no picture, for one event, which
 * nobody would trace back to a URL scheme.
 *
 * Checked here rather than in the Zod schema on purpose. The schema runs on the
 * reader's device, and failing the whole manifest over one bad link would blank
 * the archive for everybody; this runs before anything is published, which is
 * where a content problem belongs.
 */
function reportInsecureUrls(label: string, events: readonly HistoricalEvent[]): void {
  const bad: string[] = [];
  for (const event of events) {
    for (const [field, value] of [
      ['imageUrl', event.imageUrl],
      ['imageSourceUrl', event.imageSourceUrl],
    ] as const) {
      if (typeof value === 'string' && value.length > 0 && !value.startsWith('https://')) {
        bad.push(`  ${event.id} · ${field} · ${value}`);
      }
    }
  }
  if (bad.length > 0) {
    console.error(`${label} INSECURE URLS: ${bad.length}`);
    for (const line of bad.slice(0, 10)) {
      console.error(line);
    }
    failed = true;
    return;
  }
  console.log(`${label} URLS OK: every image and source link is https`);
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

/**
 * Can every day actually fill the daily quiz?
 *
 * Nothing asked this before, and it was the whole bug: the quiz was capped at
 * three questions because three was all a free deck could supply, and no gate
 * anywhere connected the number the app asks for to the number the archive can
 * answer. A pipeline run that thins a day, or an authored pool that fails to
 * publish, would put a reader back on a short quiz with no warning.
 *
 * Run against the free deck only. Free is the tight one by construction — it
 * sees three events where Pro sees the day — so a free day that fills means a
 * Pro day fills several times over.
 */
if (existsSync(published) && existsSync(quizzesPath)) {
  const events = (JSON.parse(readFileSync(published, 'utf8')) as { events: HistoricalEvent[] })
    .events;
  const authored = (
    JSON.parse(readFileSync(quizzesPath, 'utf8')) as {
      quizzes: Record<string, ScenarioQuestion[]>;
    }
  ).quizzes;

  const byDate = new Map<string, HistoricalEvent[]>();
  for (const event of events) {
    byDate.set(event.dateKey, [...(byDate.get(event.dateKey) ?? []), event]);
  }

  const want = dailyQuestionCount(false);
  let worst = Number.POSITIVE_INFINITY;
  const short: string[] = [];

  for (const [dateKey, dayEvents] of byDate) {
    // Exactly what the app does at quiz time: attach the pools fetched from
    // quizzes.json, then plan the free deck.
    const withPools = dayEvents.map((event) => {
      const pool = authored[event.id];
      return pool && event.quizPool.length === 0 ? { ...event, quizPool: pool } : event;
    });
    const deck = planDeck(withPools, { isPro: false, seen: {} }).events;
    const supply = deck.reduce((n, event) => n + questionsFor(event, withPools).length, 0);
    worst = Math.min(worst, supply);
    if (supply < want) {
      short.push(`${dateKey} (${supply})`);
    }
  }

  if (short.length > 0) {
    console.error(
      `QUIZ SUPPLY SHORT: ${short.length} day(s) cannot fill a ${want}-question free quiz:`,
    );
    console.error(`  ${short.slice(0, 12).join(', ')}${short.length > 12 ? ', …' : ''}`);
    failed = true;
  } else {
    console.log(
      `QUIZ SUPPLY OK: all ${byDate.size} days fill a ${want}-question free quiz (worst day has ${worst})`,
    );
  }
}

if (failed) {
  process.exit(1);
}
