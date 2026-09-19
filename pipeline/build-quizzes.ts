/**
 * Author the Butterfly Effect quiz bank in bulk, ahead of time.
 *
 *   npx tsx pipeline/build-quizzes.ts --plan            # what it would cost, no spend
 *   npx tsx pipeline/build-quizzes.ts --submit          # send the batches
 *   npx tsx pipeline/build-quizzes.ts --poll            # collect and merge
 *
 * Why a separate script from build-day.ts: the archive is already written. All
 * 8056 events came through the free Wikimedia path and only 5 carry an authored
 * scenario — everything else falls back to the generated recall questions in
 * src/data/quizGeneration.ts, which are honest but are not the product. This
 * pass adds the authored layer WITHOUT touching a single word of the events
 * themselves: it reads them, writes questions, and merges the questions back.
 *
 * Why the Batch API: half price, and there is no user waiting. A full-archive
 * run is roughly $24 instead of $48. The trade is latency (minutes to hours),
 * which costs us nothing here.
 *
 * Why submit and poll are separate commands: a batch survives on Anthropic's
 * side for 29 days. Once --submit returns, the money is spent and the work is
 * safe from anything that happens to this machine — a crash, a closed terminal,
 * a power cut. --poll can be run tomorrow and still collect everything.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import { prominence } from '../src/data/deckPlan';
import { seededShuffle } from '../src/data/quizGeneration';
import { manifestSchema, scenarioQuestionSchema } from '../src/data/manifest/schema';
import type { HistoricalEvent } from '../src/types/manifest';

const MODEL = process.env.QUIZ_MODEL ?? 'claude-sonnet-5';
const DB_PATH = path.resolve('pipeline/events-db.json');
const STATE_PATH = path.resolve('pipeline/quiz-batches.json');
const DRAFTS_DIR = path.resolve('pipeline/drafts');

/** Events per request. Small enough that one bad reply loses six, not a day. */
const EVENTS_PER_REQUEST = 6;
/** Requests per batch. Smaller batches finish sooner and merge sooner. */
const REQUESTS_PER_BATCH = 500;
/** Default depth: the strongest N events of each day get an authored scenario. */
const DEFAULT_TOP_PER_DAY = 6;

/**
 * Batch pricing for Sonnet, USD per million tokens — HALF the standard rate.
 * Hard-coded so --plan can answer before spending anything, which means it goes
 * stale silently. Re-check against anthropic.com/pricing before a large run;
 * the estimate is a decision aid, never the invoice.
 */
const PRICE_IN_PER_MTOK = 1.5;
const PRICE_OUT_PER_MTOK = 7.5;
/** Rough but stable: English prose runs about four characters to the token. */
const CHARS_PER_TOKEN = 4;
/** Measured on the five authored events already in the archive. */
const OUTPUT_TOKENS_PER_QUESTION = 340;

const SYSTEM_PROMPT = `You write the "Butterfly Effect" scenario quiz for History Unlocked, a premium this-day-in-history app.

You are given events that are ALREADY in the archive, written and verified. Your job is only to write one quiz question about each. Never invent an event, never correct one, never rewrite a title.

SKIP FREELY
Return nothing for an event you cannot write about accurately. The "summary" is a Wikipedia extract of the LINKED ARTICLE, and it is frequently about the subject rather than the occasion — an extract opening "Nagasaki is the capital of Nagasaki Prefecture" tells you nothing about the martyrdom that happened there. If the extract is a definition, or the event is too obscure for you to be sure of its detail, omit it. Omitting costs nothing. A confidently wrong scenario is the worst thing you can produce, because the reader will believe it and repeat it.

THE QUESTION
- scenario: 1-3 sentences, second person, present tense, putting the reader inside the moment with a real decision in front of them. "It is dawn on 6 June 1944. You command the lead company..." Max 320 characters.
- prompt: the question itself, max 120 characters. Ask what a participant should DO, or what actually FOLLOWED. Never "in which year" and never "which of these happened" — the app already generates recall questions of that kind, and an authored scenario that duplicates them is wasted.
- choices: exactly 4, exactly one with isCorrect true. Wrong answers must be genuine period options that a reader who half-knows the era would consider. No joke options, no anachronisms as filler, no answer that is obviously absurd.
- butterflyEffect: what actually happened and how it rippled forward. 2-4 sentences, max 600 characters. This is the payoff, so it must teach something the card did not already say. If the long-term ripple is genuinely contested, give the immediate consequence instead of guessing.

TONE
Events marked solemn are ones where a death toll IS the event — genocides, massacres, famines, mass-casualty disasters. Ask about decisions, causes or consequences. Never about the toll, never as a game, never with a wrong answer that reads as flippant. If you cannot ask respectfully, skip the event.

ACCURACY OVER COVERAGE
Every factual claim must be one you are confident in. Returning four good questions from six events is a better result than six, one of which is wrong.`;

const WIRE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['questions'],
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['eventId', 'scenario', 'prompt', 'choices', 'butterflyEffect'],
        properties: {
          eventId: { type: 'string' },
          scenario: { type: 'string' },
          prompt: { type: 'string' },
          butterflyEffect: { type: 'string' },
          choices: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['text', 'isCorrect'],
              properties: {
                text: { type: 'string' },
                isCorrect: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  },
} as const;

const wireReplySchema = z.object({
  questions: z.array(
    z.object({
      eventId: z.string().min(1),
      scenario: z.string().min(1),
      prompt: z.string().min(1),
      butterflyEffect: z.string().min(1),
      choices: z.array(z.object({ text: z.string().min(1), isCorrect: z.boolean() })),
    }),
  ),
});

const stateSchema = z.object({
  batches: z.array(
    z.object({
      id: z.string(),
      submittedAt: z.string(),
      requests: z.number(),
      events: z.number(),
      merged: z.boolean(),
    }),
  ),
});
type State = z.infer<typeof stateSchema>;

function readArg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return v && !v.startsWith('--') ? v : null;
}

function readState(): State {
  if (!existsSync(STATE_PATH)) {
    return { batches: [] };
  }
  return stateSchema.parse(JSON.parse(readFileSync(STATE_PATH, 'utf8')));
}

function writeState(state: State): void {
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

function readDb(): HistoricalEvent[] {
  return manifestSchema.parse(JSON.parse(readFileSync(DB_PATH, 'utf8'))).events;
}

/**
 * Which events to write for, strongest first within each day.
 *
 * Ranked by the app's own {@link prominence}, so the money goes to the cards
 * readers are actually served: a free reader sees three events a day and the
 * daily quiz draws from the deck's head. Writing scenarios for the twenty-second
 * event of a day would be paying for something almost nobody reaches.
 */
function selectEvents(all: readonly HistoricalEvent[], topPerDay: number | 'all'): HistoricalEvent[] {
  const byDay = new Map<string, HistoricalEvent[]>();
  for (const event of all) {
    if (event.quizPool.length > 0) {
      continue; // Already authored — never pay to overwrite written copy.
    }
    const bucket = byDay.get(event.dateKey);
    if (bucket) {
      bucket.push(event);
    } else {
      byDay.set(event.dateKey, [event]);
    }
  }

  const picked: HistoricalEvent[] = [];
  for (const dateKey of [...byDay.keys()].sort()) {
    const day = (byDay.get(dateKey) ?? [])
      .slice()
      .sort((a, b) => prominence(b) - prominence(a) || a.id.localeCompare(b.id));
    picked.push(...(topPerDay === 'all' ? day : day.slice(0, topPerDay)));
  }
  return picked;
}

/** What the model is shown. Deliberately not the whole event — no imagery, no credits. */
function payloadFor(event: HistoricalEvent) {
  return {
    eventId: event.id,
    year: event.year,
    title: event.title,
    region: event.region,
    era: event.era,
    category: event.category,
    solemn: event.sensitivity === 'solemn' ? true : undefined,
    facts: event.facts.map((f) => f.text),
    summary: event.summary,
  };
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function requestFor(group: readonly HistoricalEvent[], index: number): Anthropic.Messages.BatchCreateParams.Request {
  return {
    custom_id: `q-${index}-${group[0]?.dateKey ?? 'x'}`,
    params: {
      model: MODEL,
      max_tokens: 8000,
      system: [
        // Identical across every request in the run, so it is cached once and
        // read back at a tenth of the price for the other thousand-plus.
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: `Write one scenario question for each of these events you can write about accurately. Copy each eventId back exactly. Omit any event you are not sure of.\n\n${JSON.stringify(
            group.map(payloadFor),
            null,
            1,
          )}`,
        },
      ],
      output_config: { format: { type: 'json_schema', schema: WIRE_SCHEMA } },
    },
  };
}

function estimate(groups: readonly (readonly HistoricalEvent[])[]): {
  inTokens: number;
  outTokens: number;
  usd: number;
} {
  let inChars = 0;
  let questions = 0;
  for (const group of groups) {
    inChars += JSON.stringify(group.map(payloadFor)).length;
    questions += group.length;
  }
  // The system prompt is charged in full once, then at cache-read rates. Close
  // enough to fold in at a tenth for every request after the first.
  const systemTokens =
    SYSTEM_PROMPT.length / CHARS_PER_TOKEN + (groups.length * SYSTEM_PROMPT.length) / CHARS_PER_TOKEN / 10;
  const inTokens = Math.round(inChars / CHARS_PER_TOKEN + systemTokens);
  const outTokens = questions * OUTPUT_TOKENS_PER_QUESTION;
  const usd = (inTokens / 1e6) * PRICE_IN_PER_MTOK + (outTokens / 1e6) * PRICE_OUT_PER_MTOK;
  return { inTokens, outTokens, usd };
}

/* -------------------------------------------------------------------------- */
/* commands                                                                    */
/* -------------------------------------------------------------------------- */

function plan(groups: readonly HistoricalEvent[][], selected: readonly HistoricalEvent[], all: readonly HistoricalEvent[]): void {
  const { inTokens, outTokens, usd } = estimate(groups);
  const days = new Set(selected.map((e) => e.dateKey)).size;
  console.log(`
Archive        ${all.length} events, ${all.filter((e) => e.quizPool.length > 0).length} already authored
Selected       ${selected.length} events across ${days} days
Requests       ${groups.length} (${EVENTS_PER_REQUEST} events each) in ${Math.ceil(groups.length / REQUESTS_PER_BATCH)} batch(es)
Tokens         ~${inTokens.toLocaleString()} in · ~${outTokens.toLocaleString()} out
Estimated cost ~$${usd.toFixed(2)} at batch rates (${MODEL})

Estimate only — verify the current rates before a large run.
Nothing has been sent. Re-run with --submit to spend it.`);
}

async function submit(groups: readonly HistoricalEvent[][]): Promise<void> {
  const client = new Anthropic();
  const state = readState();

  const requests = groups.map((group, i) => requestFor(group, i));
  const batches = chunk(requests, REQUESTS_PER_BATCH);

  for (const [i, slice] of batches.entries()) {
    const created = await client.messages.batches.create({ requests: slice });
    state.batches.push({
      id: created.id,
      submittedAt: new Date().toISOString(),
      requests: slice.length,
      events: slice.length * EVENTS_PER_REQUEST,
      merged: false,
    });
    // Written after EVERY batch, not at the end: an interruption here must
    // never leave a paid-for batch with no record of its id.
    writeState(state);
    console.log(`  batch ${i + 1}/${batches.length} → ${created.id} (${slice.length} requests)`);
  }

  console.log(`\nSubmitted. Results are held for 29 days.\nRun --poll to collect them.`);
}

/**
 * Shuffle the options and number them afterwards.
 *
 * NOT cosmetic. Asked for four options with exactly one correct, the model puts
 * the correct one FIRST 88% of the time — measured across 6017 authored
 * questions, at which point tapping option one without reading scores 88% and
 * the quiz has stopped being a test of anything. Seeded by the event id, so a
 * re-run produces the same order and the archive stays reproducible.
 */
function orderChoices(
  choices: readonly { text: string; isCorrect: boolean }[],
  eventId: string,
): { id: string; text: string; isCorrect: boolean }[] {
  return seededShuffle(choices, `${eventId}:choices`).map((c, i) => ({
    id: `c${i + 1}`,
    text: c.text.trim(),
    isCorrect: c.isCorrect,
  }));
}

/** Turn one model reply into questions the manifest schema accepts, or drop it. */
function acceptQuestions(
  reply: z.infer<typeof wireReplySchema>,
  byId: Map<string, HistoricalEvent>,
  rejected: string[],
): number {
  let accepted = 0;

  for (const q of reply.questions) {
    const event = byId.get(q.eventId);
    if (!event) {
      rejected.push(`unknown eventId ${q.eventId}`);
      continue;
    }
    if (event.quizPool.length > 0) {
      continue; // Idempotent: re-merging the same batch must not duplicate.
    }
    if (q.choices.length < 3) {
      rejected.push(`${q.eventId}: only ${q.choices.length} choices`);
      continue;
    }
    const texts = new Set(q.choices.map((c) => c.text.trim().toLowerCase()));
    if (texts.size !== q.choices.length) {
      rejected.push(`${q.eventId}: duplicate choice text`);
      continue;
    }

    const parsed = scenarioQuestionSchema.safeParse({
      // Not "gen-": isGeneratedQuestion() keys off that prefix to label a
      // question as a generated drill, and this one is authored.
      id: `q-${event.id}`,
      scenario: q.scenario.trim(),
      prompt: q.prompt.trim(),
      butterflyEffect: q.butterflyEffect.trim(),
      choices: orderChoices(q.choices, event.id),
    });
    if (!parsed.success) {
      rejected.push(`${q.eventId}: ${parsed.error.issues[0]?.message ?? 'invalid'}`);
      continue;
    }

    event.quizPool = [parsed.data];
    accepted++;
  }

  return accepted;
}

async function poll(): Promise<void> {
  const client = new Anthropic();
  const state = readState();
  const pending = state.batches.filter((b) => !b.merged);

  if (pending.length === 0) {
    console.log('No unmerged batches. Nothing to collect.');
    return;
  }

  const events = readDb();
  const byId = new Map(events.map((e) => [e.id, e]));
  const rejected: string[] = [];
  let totalAccepted = 0;
  let touchedDb = false;

  if (!existsSync(DRAFTS_DIR)) {
    mkdirSync(DRAFTS_DIR, { recursive: true });
  }

  for (const record of pending) {
    const batch = await client.messages.batches.retrieve(record.id);
    if (batch.processing_status !== 'ended') {
      const counts = batch.request_counts;
      console.log(
        `  ${record.id}: ${batch.processing_status} — ${counts.succeeded}/${record.requests} done, ${counts.processing} processing`,
      );
      continue;
    }

    let accepted = 0;
    let failed = 0;
    const raw: unknown[] = [];

    for await (const entry of await client.messages.batches.results(record.id)) {
      if (entry.result.type !== 'succeeded') {
        failed++;
        continue;
      }
      const text = entry.result.message.content.find(
        (b): b is Anthropic.TextBlock => b.type === 'text',
      )?.text;
      if (!text) {
        failed++;
        continue;
      }

      let reply: z.infer<typeof wireReplySchema>;
      try {
        reply = wireReplySchema.parse(JSON.parse(text));
      } catch {
        rejected.push(`${entry.custom_id}: unparseable reply`);
        failed++;
        continue;
      }

      raw.push({ custom_id: entry.custom_id, ...reply });
      accepted += acceptQuestions(reply, byId, rejected);
    }

    // The model's own words, kept before the schema trimmed anything — the only
    // copy of work that has already been paid for.
    writeFileSync(
      path.join(DRAFTS_DIR, `quizzes-${record.id}.json`),
      `${JSON.stringify(raw, null, 1)}\n`,
    );

    record.merged = true;
    totalAccepted += accepted;
    touchedDb ||= accepted > 0;
    console.log(`  ${record.id}: ended — ${accepted} questions accepted, ${failed} request(s) failed`);
  }

  if (touchedDb) {
    const merged = manifestSchema.parse({
      version: 1,
      generatedAt: new Date().toISOString(),
      events: events.sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.year - b.year),
    });
    writeFileSync(DB_PATH, `${JSON.stringify(merged, null, 2)}\n`);
  }
  writeState(state);

  if (rejected.length > 0) {
    console.log(`\nRejected ${rejected.length}:`);
    for (const line of rejected.slice(0, 20)) {
      console.log(`  ~ ${line}`);
    }
    if (rejected.length > 20) {
      console.log(`  … and ${rejected.length - 20} more`);
    }
  }

  const authored = events.filter((e) => e.quizPool.length > 0).length;
  console.log(
    `\n+${totalAccepted} questions merged. Archive now has ${authored}/${events.length} authored events.`,
  );
  if (totalAccepted > 0) {
    console.log('Next: npm run pipeline:publish && npm run pipeline:fixture');
  }
}

/**
 * Repair pass: re-shuffle the options of every authored question already in the
 * database.
 *
 * Needed once, because the first full run merged the model's own ordering and
 * that ordering put the answer first 88% of the time. Idempotent — the shuffle
 * is seeded by the event id, so running it twice produces the same result.
 */
function reorder(): void {
  const events = readDb();
  let touched = 0;

  for (const event of events) {
    if (event.quizPool.length === 0) {
      continue;
    }
    for (const question of event.quizPool) {
      question.choices = orderChoices(question.choices, event.id);
    }
    touched++;
  }

  const merged = manifestSchema.parse({
    version: 1,
    generatedAt: new Date().toISOString(),
    events: events.sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.year - b.year),
  });
  writeFileSync(DB_PATH, `${JSON.stringify(merged, null, 2)}\n`);

  const positions = [0, 0, 0, 0];
  for (const event of events) {
    for (const question of event.quizPool) {
      const index = question.choices.findIndex((c) => c.isCorrect);
      if (index >= 0 && index < positions.length) {
        positions[index] = (positions[index] ?? 0) + 1;
      }
    }
  }
  const total = positions.reduce((a, b) => a + b, 0);
  console.log(`Re-ordered ${touched} authored events. Correct-answer position:`);
  positions.forEach((count, i) =>
    console.log(`  option ${i + 1}: ${count} (${((100 * count) / total).toFixed(1)}%)`),
  );
}

async function main(): Promise<void> {
  const wantsSubmit = process.argv.includes('--submit');
  const wantsPoll = process.argv.includes('--poll');

  if (process.argv.includes('--reorder')) {
    reorder();
    return;
  }

  if (wantsPoll) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set.');
      process.exit(1);
    }
    await poll();
    return;
  }

  const all = readDb();
  const topPerDay = process.argv.includes('--all')
    ? ('all' as const)
    : Number(readArg('--top') ?? String(DEFAULT_TOP_PER_DAY));
  const month = readArg('--month');
  const limit = Number(readArg('--limit') ?? '0');

  let selected = selectEvents(all, topPerDay);
  if (month) {
    const mm = month.padStart(2, '0');
    selected = selected.filter((e) => e.dateKey.startsWith(`${mm}-`));
  }
  if (limit > 0) {
    selected = selected.slice(0, limit);
  }

  if (selected.length === 0) {
    console.log('Nothing to author — every selected event already has a quiz.');
    return;
  }

  const groups = chunk(selected, EVENTS_PER_REQUEST);

  if (!wantsSubmit) {
    plan(groups, selected, all);
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set.');
    process.exit(1);
  }
  const { usd } = estimate(groups);
  console.log(`Submitting ${groups.length} requests for ${selected.length} events (~$${usd.toFixed(2)})…`);
  await submit(groups);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
