/**
 * Build a rich day of content, grounded in Wikimedia's "on this day" feed.
 *
 *   npx tsx pipeline/build-day.ts --date 06-11 [--count 12] [--days 7] [--dry]
 *
 * Pipeline: feed candidates → Claude selects and writes our copy → archival
 * image per event → Zod gate → merged into pipeline/events-db.json.
 *
 * Why grounded rather than free generation: the model never invents an event.
 * It picks from verified Wikimedia entries and copies `year` and `wikiTitle`
 * through untouched, so every card traces back to a real article. The model's
 * job is editorial — choose the strongest dozen, and write them in our voice.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import { historicalEventSchema, manifestSchema } from '../src/data/manifest/schema';
import { resolveArchivalImage } from './archival';
import { EventCandidate, fetchDayCandidates } from './onthisday';

const MODEL = process.env.EVENTS_MODEL ?? 'claude-sonnet-5';
const DB_PATH = path.resolve('pipeline/events-db.json');
const THUMB_WIDTH = 1200;
const DEFAULT_COUNT = 12;
/** Feeding every candidate wastes tokens; the ranked head is what matters. */
const MAX_CANDIDATES = 45;

/** What the model returns — we own dateKey, imagery, and coordinates. */
const draftedEventSchema = historicalEventSchema.omit({
  dateKey: true,
  imageUrl: true,
  imageCredit: true,
  imageSourceUrl: true,
  imageAspect: true,
  coordinates: true,
});
type DraftedEvent = z.infer<typeof draftedEventSchema>;

const SYSTEM_PROMPT = `You are the editor of "History Unlocked", a premium "this day in history" app with a full-screen swipeable feed, Blinkist-grade density, and scenario-based quizzes.

You are given VERIFIED events for one calendar date, taken from Wikimedia's curated "on this day" feed. Your job is editorial, not inventive.

SELECTION
- Choose the strongest N events from the candidates. Never invent an event, and never use one that is not in the list.
- Copy "year" and "wikiTitle" EXACTLY as given for the candidate you chose. They are the app's link to the source and to the artwork; altering them breaks both.
- Curate for a reader who wants range: spread across centuries (not five events from the 1900s), across the globe (actively include Asia, Africa, the Americas, the Middle East and Oceania, not only Europe and the USA), and across categories.
- Prefer events with genuine narrative weight — a turning point, a first, a disaster with consequences, a decision that echoed. Skip routine administrative entries and minor sports results.

WRITING
- title: punchy, present tense, max 90 chars, no trailing period. Not a copy of the source sentence — rewrite it.
- region: the specific place ("Normandy, France", "Kyoto, Japan").
- category: exactly one of Military & Conflict, Politics & Power, Science & Technology, Exploration & Discovery, Culture & Ideas, Society & Rights, Disaster & Tragedy, Sports & Games, Nations & Empires. Use "Nations & Empires" when a state itself comes into being, changes shape, or ends — foundings, independence, unification, partition, dynasty and empire beginnings, dissolutions.
- era: Ancient, Classical, Medieval, Early Modern, Industrial, or Modern.
- facts: 3-4 per event, each ONE sentence, max 160 chars, each with a fitting emoji icon. Concrete and surprising — a number, a name, a consequence. Never filler, never a restatement of the title.
- quizPool: exactly 1 scenario question per event. Second-person, decision-based framing ("It is dawn on ... You command ..."), never rote recall. 3-4 choices, EXACTLY one correct, wrong ones plausible. butterflyEffect explains what really happened and how it rippled forward.
- tactical: add it to AT MOST ONE event per day — the single biggest military/strategic/technological turning point, and only if you genuinely know the assets, commanders and consequences. Omit it everywhere else rather than guessing.

LANGUAGE AND LICENSING
- The source text is CC BY-SA. Write everything in your own words; never copy phrasing through.
- Be accurate. If you are unsure of a detail, leave it out rather than inventing it.

IDS
- Event id: "evt-<year>-<short-kebab-slug>" (BCE: "evt-bce<year>-..."). Child ids: facts f1..f4, choices c1..c4, question q-<year>-1, assets a1.., commanders c1.., impacts i1...`;

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
        required: ['id', 'wikiTitle', 'year', 'era', 'category', 'title', 'region', 'facts', 'quizPool'],
        properties: {
          id: { type: 'string' },
          wikiTitle: { type: 'string' },
          year: { type: 'integer' },
          era: {
            type: 'string',
            enum: ['Ancient', 'Classical', 'Medieval', 'Early Modern', 'Industrial', 'Modern'],
          },
          category: {
            type: 'string',
            enum: [
              'Military & Conflict',
              'Politics & Power',
              'Science & Technology',
              'Exploration & Discovery',
              'Culture & Ideas',
              'Society & Rights',
              'Disaster & Tragedy',
              'Sports & Games',
              'Nations & Empires',
            ],
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

function readArg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return v && !v.startsWith('--') ? v : null;
}

function dateRange(startKey: string, days: number): string[] {
  const [mm = 1, dd = 1] = startKey.split('-').map(Number);
  return Array.from({ length: Math.max(1, days) }, (_, i) => {
    const d = new Date(2024, mm - 1, dd + i);
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

async function draftDay(
  client: Anthropic,
  dateKey: string,
  candidates: EventCandidate[],
  count: number,
): Promise<DraftedEvent[]> {
  const [mm = '01', dd = '01'] = dateKey.split('-');
  const monthName = new Date(2024, Number(mm) - 1, Number(dd)).toLocaleString('en', {
    month: 'long',
  });

  const payload = candidates.slice(0, MAX_CANDIDATES).map((c) => ({
    year: c.year,
    wikiTitle: c.wikiTitle,
    summary: c.summary,
    extract: c.extract,
    hasImage: c.hasImage,
    curated: c.curated,
  }));

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    system: [
      // Stable across all 366 days — cached so a full-year run pays for it once.
      { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    ],
    messages: [
      {
        role: 'user',
        content: `Date: ${monthName} ${Number(dd)} (dateKey "${dateKey}").
Select the ${count} strongest events from these verified candidates and write them for the app.

${JSON.stringify(payload, null, 1)}`,
      },
    ],
    output_config: { format: { type: 'json_schema', schema: WIRE_SCHEMA } },
  });

  const message = await stream.finalMessage();
  const text = message.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text;
  if (!text) {
    throw new Error(`No text block returned (stop_reason: ${message.stop_reason})`);
  }

  const parsed = z
    .object({ events: z.array(draftedEventSchema) })
    .safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new Error(`Draft failed schema validation:\n${parsed.error.message}`);
  }
  return parsed.data.events;
}

/** Free preview of a date's raw material — no API key, no spend. */
async function listCandidates(dateKey: string): Promise<void> {
  const candidates = await fetchDayCandidates(dateKey);
  const withImage = candidates.filter((c) => c.hasImage).length;
  const withCoords = candidates.filter((c) => c.coordinates).length;
  console.log(
    `\n=== ${dateKey}: ${candidates.length} candidates · ${withImage} with imagery · ${withCoords} with coordinates ===`,
  );
  for (const c of candidates.slice(0, 25)) {
    const flags = `${c.curated ? '★' : ' '}${c.hasImage ? '🖼' : '  '}`;
    console.log(`${flags} ${String(c.year).padStart(5)}  ${c.summary.slice(0, 96)}`);
  }
}

async function main(): Promise<void> {
  const candidatesOnly = process.argv.includes('--candidates');

  if (!candidatesOnly && !process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY is not set.');
    process.exit(1);
  }

  const startKey = readArg('--date');
  if (!startKey) {
    console.error('Pass --date MM-DD');
    process.exit(1);
  }
  const days = Number(readArg('--days') ?? '1');
  const count = Number(readArg('--count') ?? String(DEFAULT_COUNT));
  const dry = process.argv.includes('--dry');

  if (candidatesOnly) {
    for (const dateKey of dateRange(startKey, days)) {
      await listCandidates(dateKey);
    }
    return;
  }

  const client = new Anthropic();
  const db = manifestSchema.parse(JSON.parse(readFileSync(DB_PATH, 'utf8')));
  const byId = new Map(db.events.map((e) => [e.id, e]));

  for (const dateKey of dateRange(startKey, days)) {
    console.log(`\n=== ${dateKey} ===`);
    const candidates = await fetchDayCandidates(dateKey);
    console.log(`  ${candidates.length} candidates (${candidates.filter((c) => c.hasImage).length} with imagery)`);

    const drafted = await draftDay(client, dateKey, candidates, count);
    console.log(`  drafted ${drafted.length} events`);

    const byWikiTitle = new Map(candidates.map((c) => [c.wikiTitle, c]));
    let kept = 0;

    for (const draft of drafted) {
      // Grounding check: the model must have chosen a real candidate.
      const source = draft.wikiTitle ? byWikiTitle.get(draft.wikiTitle) : undefined;
      if (!source) {
        console.warn(`  ~ skipping "${draft.title}" — wikiTitle not among candidates`);
        continue;
      }

      const image = await resolveArchivalImage({
        wikiTitle: draft.wikiTitle,
        fallbackQuery: `${draft.title} ${draft.region} ${draft.year}`,
        width: THUMB_WIDTH,
      });
      if (!image) {
        console.warn(`  ~ skipping "${draft.title}" — no freely-licensed image`);
        continue;
      }

      const event = historicalEventSchema.parse({
        ...draft,
        dateKey,
        coordinates: source.coordinates,
        imageUrl: image.imageUrl,
        imageCredit: image.credit,
        imageSourceUrl: image.sourceUrl,
        imageAspect: image.aspect,
      });

      byId.set(event.id, event);
      kept++;
      console.log(`  ✓ ${event.year} ${event.title}  [${event.category}]`);
    }

    console.log(`  kept ${kept}/${drafted.length}`);
  }

  if (dry) {
    console.log('\nDry run — nothing written.');
    return;
  }

  const merged = manifestSchema.parse({
    version: 1,
    generatedAt: new Date().toISOString(),
    events: [...byId.values()].sort(
      (a, b) => a.dateKey.localeCompare(b.dateKey) || a.year - b.year,
    ),
  });
  writeFileSync(DB_PATH, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`\nWrote ${merged.events.length} total events → pipeline/events-db.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
