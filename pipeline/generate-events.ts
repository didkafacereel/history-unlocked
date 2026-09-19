/**
 * LLM content generator for the events database.
 *
 *   npx tsx pipeline/generate-events.ts [--date MM-DD] [--days N] [--count N]
 *   npx tsx pipeline/generate-events.ts --merge
 *
 * Generate mode: drafts events for each date via the Claude API and writes
 * them to pipeline/drafts/<MM-DD>.json — ALREADY validated by the app's own
 * Zod schema (the same gate the app enforces at ingestion). You review the
 * drafts (read them, or `git diff` after merge), then:
 *
 * Merge mode (--merge): folds all drafts into pipeline/events-db.json,
 * de-duplicating by id, re-validating the whole DB, and deleting the drafts.
 *
 * Requires ANTHROPIC_API_KEY (generate mode only).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import { historicalEventSchema, manifestSchema } from '../src/data/manifest/schema';
import { todayDateKey } from '../src/lib/dateKey';

const MODEL = process.env.EVENTS_MODEL ?? 'claude-opus-4-8';
const DRAFTS_DIR = path.resolve('pipeline/drafts');
const DB_PATH = path.resolve('pipeline/events-db.json');

/** What the model produces: a full event minus the fields the script owns. */
const generatedEventSchema = historicalEventSchema.omit({ dateKey: true, imageUrl: true });
type GeneratedEvent = z.infer<typeof generatedEventSchema>;

const draftFileSchema = z.object({
  dateKey: z.string().regex(/^\d{2}-\d{2}$/),
  generatedAt: z.string(),
  model: z.string(),
  events: z.array(historicalEventSchema).min(1),
});

// ---------------------------------------------------------------------------
// Prompting
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are the content engine for "History Unlocked", a mobile "Today in History" app with a TikTok-style swipe feed, Blinkist-grade information density, and a scenario-based daily quiz ("Butterfly Effect Engine").

You generate historical events for a given calendar date as strict JSON. Quality bar:

ACCURACY
- Only real, well-documented historical events that actually occurred on the given month/day. No legends presented as fact, no approximate dates.
- Years, names, places, and figures must be verifiable. If unsure of a detail, choose a different event you are sure of.

SELECTION (per date)
- Span eras: mix Ancient/Classical/Medieval/Early Modern/Industrial/Modern where the date allows.
- Span the globe: actively include Asia, Africa, the Americas, the Middle East, and Oceania — not only Europe and the USA.
- Mix domains: battles and politics, but also science, technology, exploration, culture, and human rights.
- Exactly ONE event per date should be a major strategic/military/technological shift and carry full "tactical" data; the others omit the tactical field.

WRITING STYLE
- title: punchy, present-tense, max 90 chars, no trailing period.
- facts: 3-4 per event. Each fact is ONE sentence, max 160 chars, concrete and surprising — a number, a name, a consequence. Never generic filler.
- Each fact's icon is a single relevant emoji.
- quizPool: exactly 1 scenario question per event. Second-person, decision-based framing ("It is dawn on ... You command ..."), never rote recall. 3-4 choices, EXACTLY one with isCorrect true, wrong options plausible. butterflyEffect explains what really happened and how it rippled through history (1-3 sentences).
- tactical (only on the designated event): 2-4 assets with real quantities, 2-3 commanders with faction and role, 2 impacts with horizon labels like "+11 months" / "+3 centuries".

IMAGERY (wikiTitle)
- Every event MUST carry "wikiTitle": the exact English Wikipedia article title whose LEAD IMAGE best depicts this event. The pipeline pulls the card backdrop from it, so relevance is everything — a wrong article means a wrong picture, which is the worst defect this app can ship.
- Prefer the article about the specific event, battle, speech, ship, or treaty ("Normandy landings", "Report to the American People on Civil Rights", "HMS Endeavour"). Fall back to the central person or place only when no event article exists ("Henry VIII").
- Choose an article you are confident EXISTS and carries a photograph, painting, or engraving. Avoid disambiguation pages and broad concepts ("War", "Politics") — they yield generic or missing images.

IDS
- Event id: "evt-<year>-<short-kebab-slug>" (e.g. "evt-1969-apollo-11-landing"). BCE years: "evt-bce<year>-...".
- Child ids (facts f1..f4, choices c1..c4, questions q-<year>-1, assets a1.., commanders c1.., impacts i1..) unique within their parent.

Return data that satisfies the JSON schema exactly. No commentary.`;

function userPrompt(dateKey: string, count: number, avoid: string[]): string {
  const [mm = '01', dd = '01'] = dateKey.split('-');
  const monthName = new Date(2000, Number(mm) - 1, Number(dd)).toLocaleString('en', {
    month: 'long',
  });
  const avoidBlock =
    avoid.length > 0
      ? `\nDo NOT reuse these events (already in the database): ${avoid.join('; ')}`
      : '';
  return `Generate exactly ${count} historical events for ${monthName} ${Number(dd)} (dateKey "${dateKey}").${avoidBlock}`;
}

/** Wire schema for structured outputs — basic shape only; the strict Zod gate
 *  (length caps, exactly-one-correct, etc.) runs after, on our side. */
const WIRE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['events'],
  properties: {
    events: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'year', 'era', 'title', 'region', 'wikiTitle', 'facts', 'quizPool'],
        properties: {
          id: { type: 'string' },
          wikiTitle: { type: 'string' },
          year: { type: 'integer' },
          era: {
            type: 'string',
            enum: ['Ancient', 'Classical', 'Medieval', 'Early Modern', 'Industrial', 'Modern'],
          },
          title: { type: 'string' },
          region: { type: 'string' },
          facts: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'icon', 'text'],
              properties: {
                id: { type: 'string' },
                icon: { type: 'string' },
                text: { type: 'string' },
              },
            },
          },
          tactical: {
            type: 'object',
            additionalProperties: false,
            required: ['assets', 'commanders', 'impacts'],
            properties: {
              assets: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['id', 'name', 'quantity', 'faction'],
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    quantity: { type: 'string' },
                    faction: { type: 'string' },
                  },
                },
              },
              commanders: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['id', 'name', 'role', 'faction'],
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    role: { type: 'string' },
                    faction: { type: 'string' },
                  },
                },
              },
              impacts: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['id', 'horizon', 'consequence'],
                  properties: {
                    id: { type: 'string' },
                    horizon: { type: 'string' },
                    consequence: { type: 'string' },
                  },
                },
              },
            },
          },
          quizPool: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'scenario', 'prompt', 'choices', 'butterflyEffect'],
              properties: {
                id: { type: 'string' },
                scenario: { type: 'string' },
                prompt: { type: 'string' },
                butterflyEffect: { type: 'string' },
                choices: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['id', 'text', 'isCorrect'],
                    properties: {
                      id: { type: 'string' },
                      text: { type: 'string' },
                      isCorrect: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

async function generateForDate(
  client: Anthropic,
  dateKey: string,
  count: number,
  avoid: string[],
  validationFeedback?: string,
): Promise<GeneratedEvent[]> {
  const prompt =
    userPrompt(dateKey, count, avoid) +
    (validationFeedback
      ? `\n\nYour previous attempt failed schema validation. Fix these issues and return the corrected full set:\n${validationFeedback}`
      : '');

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 30000,
    thinking: { type: 'adaptive' },
    system: [
      // Stable prefix — cached across the dates of a multi-day batch run.
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: prompt }],
    output_config: { format: { type: 'json_schema', schema: WIRE_SCHEMA } },
  });
  const message = await stream.finalMessage();

  const text = message.content.find(
    (b): b is Anthropic.TextBlock => b.type === 'text',
  )?.text;
  if (!text) {
    throw new Error(`Model returned no text block (stop_reason: ${message.stop_reason})`);
  }

  const parsed = z.object({ events: z.array(generatedEventSchema) }).safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new ValidationFailure(parsed.error.message);
  }
  return parsed.data.events;
}

class ValidationFailure extends Error {}

/** Generated event → full DB event: the script owns dateKey and imageUrl. */
function finalize(event: GeneratedEvent, dateKey: string) {
  return historicalEventSchema.parse({
    ...event,
    dateKey,
    imageUrl: `https://picsum.photos/seed/${event.id}/1080/1920`,
  });
}

async function runGenerate(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      'ANTHROPIC_API_KEY is not set. Create a key at https://platform.claude.com and export it first.',
    );
    process.exit(1);
  }

  const startKey = readArg('--date') ?? todayDateKey();
  const days = Number(readArg('--days') ?? '1');
  const count = Number(readArg('--count') ?? '5');
  const client = new Anthropic();

  const db = manifestSchema.parse(JSON.parse(readFileSync(DB_PATH, 'utf8')));
  mkdirSync(DRAFTS_DIR, { recursive: true });

  for (const dateKey of dateRange(startKey, days)) {
    const draftPath = path.join(DRAFTS_DIR, `${dateKey}.json`);
    if (existsSync(draftPath)) {
      console.log(`= ${dateKey}: draft already exists, skipping`);
      continue;
    }
    const existing = db.events.filter((e) => e.dateKey === dateKey);
    if (existing.length >= count) {
      console.log(`= ${dateKey}: DB already has ${existing.length} events, skipping`);
      continue;
    }

    const avoid = existing.map((e) => `${e.title} (${e.year})`);
    console.log(`> ${dateKey}: generating ${count} events via ${MODEL}...`);

    let events: GeneratedEvent[];
    try {
      events = await generateForDate(client, dateKey, count, avoid);
    } catch (error) {
      if (!(error instanceof ValidationFailure)) {
        throw error;
      }
      console.warn(`  schema rejection, retrying with feedback`);
      events = await generateForDate(client, dateKey, count, avoid, error.message);
    }

    const finalized = events.map((e) => finalize(e, dateKey));
    const draft = draftFileSchema.parse({
      dateKey,
      generatedAt: new Date().toISOString(),
      model: MODEL,
      events: finalized,
    });
    writeFileSync(draftPath, JSON.stringify(draft, null, 2));
    const tacticalCount = finalized.filter((e) => e.tactical).length;
    console.log(
      `  ✓ ${finalized.length} events (${tacticalCount} tactical) → pipeline/drafts/${dateKey}.json`,
    );
  }

  console.log('\nReview the drafts, then merge with: npm run pipeline:events -- --merge');
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

function runMerge(): void {
  if (!existsSync(DRAFTS_DIR)) {
    console.log('No drafts directory — nothing to merge.');
    return;
  }
  const draftFiles = readdirSync(DRAFTS_DIR).filter((f) => f.endsWith('.json'));
  if (draftFiles.length === 0) {
    console.log('No drafts to merge.');
    return;
  }

  const db = manifestSchema.parse(JSON.parse(readFileSync(DB_PATH, 'utf8')));
  const byId = new Map(db.events.map((e) => [e.id, e]));

  let added = 0;
  for (const file of draftFiles) {
    const draft = draftFileSchema.parse(
      JSON.parse(readFileSync(path.join(DRAFTS_DIR, file), 'utf8')),
    );
    for (const event of draft.events) {
      if (byId.has(event.id)) {
        console.warn(`  ~ skipping duplicate id ${event.id} (${file})`);
        continue;
      }
      byId.set(event.id, event);
      added++;
    }
  }

  const merged = manifestSchema.parse({
    version: 1,
    generatedAt: new Date().toISOString(),
    events: [...byId.values()].sort(
      (a, b) => a.dateKey.localeCompare(b.dateKey) || a.year - b.year,
    ),
  });
  writeFileSync(DB_PATH, JSON.stringify(merged, null, 2));

  for (const file of draftFiles) {
    rmSync(path.join(DRAFTS_DIR, file));
  }
  console.log(
    `Merged ${added} events from ${draftFiles.length} draft(s) → events-db.json now holds ${merged.events.length} events.`,
  );
}

// ---------------------------------------------------------------------------
// Utilities & entry
// ---------------------------------------------------------------------------

function readArg(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value && !value.startsWith('--') ? value : null;
}

/** N consecutive "MM-DD" keys starting at startKey (leap-year aware via 2024). */
function dateRange(startKey: string, days: number): string[] {
  const [mm = 1, dd = 1] = startKey.split('-').map(Number);
  return Array.from({ length: Math.max(1, days) }, (_, i) => {
    const d = new Date(2024, mm - 1, dd + i);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

const mode = process.argv.includes('--merge') ? runMerge() : runGenerate();
Promise.resolve(mode).catch((error) => {
  console.error(error);
  process.exit(1);
});
