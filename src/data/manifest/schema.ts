import { z } from 'zod';

import { densityCaps } from '@/theme/typography';

/**
 * Runtime gate for the automated ingestion manifest.
 * Mirrors src/types/manifest.ts 1:1. A malformed manifest must fail HERE,
 * loudly, at the ingestion boundary — never silently inside a component.
 */

export const eraSchema = z.enum([
  'Ancient',
  'Classical',
  'Medieval',
  'Early Modern',
  'Industrial',
  'Modern',
]);

export const factBlockSchema = z.object({
  id: z.string().min(1),
  icon: z.string().min(1),
  // 220, matching FACT_MAX in pipeline/lite.ts. At 160 the only clause
  // boundary in range often fell before the sentence's verb, and 30% of all
  // facts shipped ending in an ellipsis. The density rule is still this cap —
  // one sentence, no walls of text — it just clears its own sentences now.
  text: z.string().min(1).max(220),
});

export const tacticalAssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.string().min(1),
  faction: z.string().min(1),
});

export const commanderProfileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  faction: z.string().min(1),
  portraitUrl: z.string().url().optional(),
});

export const strategicImpactSchema = z.object({
  id: z.string().min(1),
  horizon: z.string().min(1),
  consequence: z.string().min(1).max(200),
});

export const tacticalDataSchema = z.object({
  assets: z.array(tacticalAssetSchema).min(1),
  commanders: z.array(commanderProfileSchema).min(1),
  impacts: z.array(strategicImpactSchema).min(1),
});

export const quizChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

export const scenarioQuestionSchema = z
  .object({
    id: z.string().min(1),
    scenario: z.string().min(1),
    prompt: z.string().min(1),
    choices: z.array(quizChoiceSchema).min(2).max(4),
    butterflyEffect: z.string().min(1),
  })
  .refine((q) => q.choices.filter((c) => c.isCorrect).length === 1, {
    message: 'A scenario question must have exactly one correct choice',
  });

/**
 * Browse/filter axis. Once a date carries a dozen-plus events, the feed needs a
 * way to let a reader follow what they actually care about.
 */
export const categorySchema = z.enum([
  'Military & Conflict',
  'Politics & Power',
  'Science & Technology',
  'Exploration & Discovery',
  'Culture & Ideas',
  'Society & Rights',
  'Disaster & Tragedy',
  'Sports & Games',
  'Nations & Empires',
]);

/**
 * Editorial tone. `solemn` marks an event where a death toll IS the event —
 * genocides, massacres, famines, mass-casualty disasters.
 *
 * This is not a content warning and it hides nothing. It exists because the
 * app's own progress mechanics are wrong on this material: a green "✓ Complete"
 * over a set of atrocities, or confetti for answering a question about a
 * massacre, is a tone failure severe enough to lose a reader's trust in
 * everything else the app says. On a solemn event the celebration is silent and
 * the collecting language goes away. The history stays exactly as it was.
 */
export const sensitivitySchema = z.enum(['standard', 'solemn']);

/** Where it happened. Sourced free from the linked Wikipedia page. */
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

export const historicalEventSchema = z.object({
  id: z.string().min(1),
  dateKey: z.string().regex(/^\d{2}-\d{2}$/, 'dateKey must be "MM-DD"'),
  year: z.number().int(),
  era: eraSchema,
  title: z.string().min(1).max(90),
  region: z.string().min(1),
  category: categorySchema.optional(),
  /** Absent means `standard` — see `sensitivitySchema`. */
  sensitivity: sensitivitySchema.optional(),
  /**
   * Readers' choice, baked in at publish time from the vote tally.
   *
   * The app never reads a live count to draw a card — the badge and the small
   * ordering nudge it earns both ride in the manifest, so the feed keeps
   * working offline and cannot be slowed or broken by the voting service.
   */
  readersChoice: z.boolean().optional(),
  /** Share of the day's votes, 0-1. Shown beside the badge. */
  voteShare: z.number().min(0).max(1).optional(),
  /**
   * A date the app is not allowed to miss (see `pipeline/cornerstones.ts`).
   * Forced into its day's build and boosted to the front of the deck: if the
   * reader opens 11 September, the attacks are the first card, full stop.
   */
  cornerstone: z.boolean().optional(),
  coordinates: coordinatesSchema.optional(),
  imageUrl: z.string().url(),
  /** Attribution line for the backdrop, e.g. "Robert F. Sargent · Public domain". */
  imageCredit: z.string().max(160).optional(),
  /**
   * width / height of the backdrop. Archival art is often landscape, which a
   * 9:16 cover-crop would slice down to a third of its width — the card uses
   * this to letterbox wide images instead of destroying their composition.
   */
  imageAspect: z.number().positive().optional(),
  /** Where the image came from (Commons file page) — the credit links here. */
  imageSourceUrl: z.string().url().optional(),
  /**
   * Attribution for the TEXT when facts are quoted from a CC BY-SA source
   * (the lite pipeline). Our own LLM-written copy leaves this empty.
   */
  textCredit: z.string().max(120).optional(),
  /**
   * English Wikipedia article for this event. The pipeline resolves archival
   * imagery from it; a future "read more" can link to it.
   */
  wikiTitle: z.string().min(1).optional(),
  /**
   * Longer prose for the read-more sheet. The card stays deliberately dense —
   * this is where a reader who taps in gets the actual story.
   */
  summary: z.string().max(4000).optional(),
  facts: z.array(factBlockSchema).min(1).max(densityCaps.maxFactsPerCard),
  tactical: tacticalDataSchema.optional(),
  quizPool: z.array(scenarioQuestionSchema),
  /**
   * Whether an authored pool EXISTS for this event, independent of whether it
   * has been downloaded.
   *
   * The pools are 2 MB gzipped of the archive's 5.7 and nothing outside a quiz
   * needs them, so the published manifest ships them in a separate file. But
   * three things that run long before any quiz starts do need to know they
   * exist — `prominence` scores an authored event higher, the simulation
   * picker prefers them, and the feed's quiz gate advertises them — and asking
   * those to wait on a second download would put the split's cost exactly
   * where its benefit was supposed to be. So the fact travels with the event
   * and the content does not.
   */
  authored: z.boolean().optional(),
});

/**
 * A person the day is known for.
 *
 * Portraits are carried because a register of nine names is a phone book, and
 * because the cost turned out to be small: the licence check is the same batched
 * call the events already make, and 94% of the people we pick have a free image.
 */
export const personEntrySchema = z.object({
  /** Year of birth or of death, depending on which list this sits in. */
  year: z.number().int(),
  name: z.string().min(1).max(80),
  /** Wikidata's one-liner, e.g. "Swiss mathematician (1707-1783)". */
  description: z.string().min(1).max(120),
  wikiTitle: z.string().min(1),
  /**
   * Free-licensed portrait. Optional because roughly one person in sixteen has
   * no usable image — the card shows a monogram for those rather than a gap.
   * Same licence rule as event imagery: free or absent, never "probably fine".
   */
  imageUrl: z.string().url().optional(),
  imageCredit: z.string().max(160).optional(),
  imageSourceUrl: z.string().url().optional(),
  /** A few sentences of who they were, for the reader who taps the row. */
  summary: z.string().max(600).optional(),
});

/**
 * Who was born and who died on a date, plus what the date is observed as.
 *
 * The "on this day" feed carries ~220 births and ~110 deaths for every date and
 * we used none of it. Curating a handful is the cheapest real content the
 * archive can gain — no model, no licence question, no new source.
 */
export const dayRegisterSchema = z.object({
  dateKey: z.string().regex(/^\d{2}-\d{2}$/, 'dateKey must be "MM-DD"'),
  births: z.array(personEntrySchema),
  deaths: z.array(personEntrySchema),
  /** National days and the like. Religious feast days are filtered out. */
  observances: z.array(z.string().min(1).max(120)),
});

export const manifestSchema = z.object({
  version: z.literal(1),
  generatedAt: z.string(),
  events: z.array(historicalEventSchema).min(1),
  /**
   * Optional so the version stays at 1: an older build simply drops the key,
   * and a newer build reading an older cached manifest sees `undefined`.
   */
  register: z.array(dayRegisterSchema).optional(),
});

export type ManifestFile = z.infer<typeof manifestSchema>;

/**
 * The authored quiz pools, published as their own file.
 *
 * Lives here rather than beside its only reader in ingestion.ts, because every
 * other schema does: one module owns the shape of everything crossing the
 * ingestion boundary, and a second file reaching for `zod` to describe part of
 * a manifest is how two descriptions of the same data start to drift.
 */
export const quizPoolsFileSchema = z.object({
  version: z.number(),
  quizzes: z.record(z.string(), z.array(scenarioQuestionSchema)),
});
