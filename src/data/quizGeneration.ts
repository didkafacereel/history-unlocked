import { monthLabel, parseDateKey } from '@/lib/dateKey';
import { HistoricalEvent, ScenarioQuestion } from '@/types/manifest';

/**
 * Recall questions built from what every event already carries.
 *
 * Only a handful of events in the archive have an authored Butterfly Effect
 * scenario — those are written by a language model and cost money per date.
 * Everything else came through the free Wikimedia path, which means most days
 * would otherwise have no quiz at all, and the streak (the thing that brings a
 * reader back) would be unreachable.
 *
 * So these fill the gap, and they are deliberately a DIFFERENT KIND of
 * question: recall, not judgement. No invented dilemma, no imagined choice —
 * just "when was this" and "what happened", answered from the manifest, with
 * the article's own summary as the payoff. The UI labels them as recall so a
 * reader is never told a generated drill is an authored scenario.
 *
 * Pure and deterministic: the same event on the same day always produces the
 * same question, so a quiz cannot be rerolled by leaving and coming back.
 */

/** FNV-1a. Small, stable across platforms, good enough to shuffle with. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic 0..1 generator seeded from a string. */
function seededRandom(seed: string): () => number {
  let state = hash(seed) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x1_0000_0000;
  };
}

/**
 * Deterministic shuffle from a string seed.
 *
 * Exported because the quiz-authoring pipeline needs exactly this and needed it
 * badly: a language model asked for four options with one correct puts the
 * correct one FIRST 88% of the time. Measured over the 6017 authored questions
 * in the archive — a reader who always tapped option one would have scored 88%
 * without reading a word. Two shuffle implementations would let that come back,
 * so there is one, and it lives here with the other question machinery.
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  return shuffle(items, seededRandom(seed));
}

function shuffle<T>(items: readonly T[], next: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : String(year);
}

/**
 * How far a wrong year may sit from the right one. Guessing within six years
 * is a real test for a 20th-century date; for antiquity, where the reader is
 * placing a century rather than a year, it would be impossible.
 */
function yearSpread(year: number): number {
  if (year < 500) return 120;
  if (year < 1500) return 45;
  if (year < 1900) return 14;
  return 6;
}

const REVEAL_MAX = 420;

/**
 * The payoff after an answer: the event stated plainly, then the article's own
 * words as background.
 *
 * The headline is not decoration. For an event sourced from the free pipeline,
 * `summary` is the extract of the LINKED ARTICLE, which is frequently about the
 * subject rather than the occasion — answer "1622" to the Nagasaki martyrdom
 * and the raw extract opens "Nagasaki is the capital of Nagasaki Prefecture".
 * True, useful, and a non sequitur on its own. Leading with the year and the
 * event makes the paragraph read as the context it actually is.
 */
function revealFor(event: HistoricalEvent): string {
  const headline = `${formatYear(event.year)} — ${event.title}`;

  const source = (event.summary?.trim() || event.facts.map((f) => f.text).join(' ')).trim();
  if (source.length === 0) {
    return headline;
  }

  let context = source;
  if (context.length > REVEAL_MAX) {
    const head = context.slice(0, REVEAL_MAX);
    const lastStop = head.lastIndexOf('. ');
    context = lastStop > 120 ? head.slice(0, lastStop + 1) : `${head.trim()}…`;
  }

  return `${headline}\n\n${context}`;
}

/**
 * The line a question is asked about. Never include the answer: a title that
 * already spells out its own year would hand the reader the year question.
 */
function briefFor(event: HistoricalEvent): string {
  const year = String(Math.abs(event.year));
  if (!event.title.includes(year)) {
    return event.title;
  }
  const fact = event.facts.find((f) => !f.text.includes(year));
  return fact?.text ?? event.title.replaceAll(year, '—');
}

/** "In which year?" — distractors are plausible neighbours, never duplicates. */
function yearQuestion(event: HistoricalEvent): ScenarioQuestion | null {
  const next = seededRandom(`${event.id}:year`);
  const spread = yearSpread(event.year);

  const wrong = new Set<number>();
  // Bounded: a tight spread on a crowded number line can reject a lot of draws.
  for (let attempt = 0; attempt < 60 && wrong.size < 3; attempt++) {
    const magnitude = 1 + Math.floor(next() * spread);
    const candidate = event.year + (next() < 0.5 ? -magnitude : magnitude);
    if (candidate !== event.year && candidate !== 0) {
      wrong.add(candidate);
    }
  }
  if (wrong.size < 3) {
    return null;
  }

  const choices = shuffle(
    [
      { id: 'c-correct', text: formatYear(event.year), isCorrect: true },
      ...[...wrong].map((y, i) => ({ id: `c${i}`, text: formatYear(y), isCorrect: false })),
    ],
    next,
  );

  return {
    id: `gen-year-${event.id}`,
    // The title is the EVENT; the first fact is the linked article's opening
    // sentence, which is often a definition of the subject rather than an
    // account of what happened ("Nagasaki is the capital of Nagasaki
    // Prefecture…"), and reads as a non sequitur under "in which year".
    scenario: briefFor(event),
    prompt: 'In which year did this happen?',
    choices,
    butterflyEffect: revealFor(event),
  };
}

/**
 * "What happened on this date?" — the other events of the same day are the
 * distractors, which keeps every option a real historical event rather than an
 * invented one, and quietly teaches the rest of the day.
 */
function whichEventQuestion(
  event: HistoricalEvent,
  pool: readonly HistoricalEvent[],
): ScenarioQuestion | null {
  const next = seededRandom(`${event.id}:which`);
  const others = shuffle(
    pool.filter((e) => e.id !== event.id && e.title !== event.title),
    next,
  ).slice(0, 3);
  if (others.length < 3) {
    return null;
  }

  const choices = shuffle(
    [
      { id: 'c-correct', text: event.title, isCorrect: true },
      ...others.map((e, i) => ({ id: `c${i}`, text: e.title, isCorrect: false })),
    ],
    next,
  );

  const { day, month } = parseDateKey(event.dateKey);

  return {
    id: `gen-which-${event.id}`,
    // `monthLabel` is the app's one month-naming helper (the calendar uses it
    // too), so the date reads the same wherever it appears.
    scenario: `${day} ${monthLabel(month)}, ${formatYear(event.year)}.`,
    prompt: 'Which of these is recorded on this date?',
    choices,
    butterflyEffect: revealFor(event),
  };
}

/**
 * "Which came first?" — three other events of the day, ordered against this one.
 *
 * Worth having because it is the only generated question that teaches something
 * the card does not already say: chronology across centuries. Every option is a
 * real event from the same date, so nothing is invented, and a reader who gets
 * it wrong has learned an ordering rather than a number.
 *
 * Requires three others with DISTINCT years — with a tie the question has two
 * correct answers, and the schema would reject it downstream anyway.
 */
function whichFirstQuestion(
  event: HistoricalEvent,
  pool: readonly HistoricalEvent[],
): ScenarioQuestion | null {
  const next = seededRandom(`${event.id}:first`);

  /** Three distinct-year events strictly on one side of this one. */
  const pick = (side: (candidate: HistoricalEvent) => boolean): HistoricalEvent[] => {
    const chosen: HistoricalEvent[] = [];
    const usedYears = new Set<number>([event.year]);
    for (const candidate of shuffle(
      pool.filter((e) => e.id !== event.id && e.title !== event.title && side(e)),
      next,
    )) {
      if (usedYears.has(candidate.year)) {
        continue;
      }
      usedYears.add(candidate.year);
      chosen.push(candidate);
      if (chosen.length === 3) {
        break;
      }
    }
    return chosen;
  };

  // Asked in whichever direction the day allows. The earliest event of a date
  // has nothing before it and the latest has nothing after, so a one-directional
  // question silently skipped both ends — 363 events across the archive, which
  // is exactly the material a reader drilling one event repeatedly runs out of.
  let others = pick((e) => e.year > event.year);
  let asksFirst = true;
  if (others.length < 3) {
    others = pick((e) => e.year < event.year);
    asksFirst = false;
  }
  if (others.length < 3) {
    return null;
  }

  const choices = shuffle(
    [
      { id: 'c-correct', text: event.title, isCorrect: true },
      ...others.map((e, i) => ({ id: `c${i}`, text: e.title, isCorrect: false })),
    ],
    next,
  );

  const { day, month } = parseDateKey(event.dateKey);

  return {
    id: `gen-first-${event.id}`,
    scenario: `Four things recorded on ${day} ${monthLabel(month)}, in four different years.`,
    prompt: asksFirst ? 'Which of them happened first?' : 'Which of them happened last?',
    choices,
    butterflyEffect: revealFor(event),
  };
}

/**
 * "Which century?" — the year question's gentler sibling, for antiquity.
 *
 * The year question widens its spread as it goes back (120 years for anything
 * before 500 CE) precisely because placing an ancient event to the year is not
 * a fair test. But a 120-year spread makes the four options look arbitrary. For
 * the deep past, asking for the century is the question a reader can actually
 * reason about, and getting it right means something.
 */
const CENTURY_CUTOFF = 1500;

function centuryOf(year: number): number {
  return year < 0 ? Math.floor((year + 1) / 100) - 1 : Math.floor(year / 100);
}

function centuryLabel(century: number): string {
  if (century < 0) {
    const ordinal = -century;
    return `${ordinal}${suffix(ordinal)} century BCE`;
  }
  const ordinal = century + 1;
  return `${ordinal}${suffix(ordinal)} century`;
}

function suffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) {
    return 'th';
  }
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

function centuryQuestion(event: HistoricalEvent): ScenarioQuestion | null {
  if (event.year >= CENTURY_CUTOFF) {
    return null;
  }
  const next = seededRandom(`${event.id}:century`);
  const truth = centuryOf(event.year);

  const wrong = new Set<number>();
  for (let attempt = 0; attempt < 40 && wrong.size < 3; attempt++) {
    const drift = 1 + Math.floor(next() * 4);
    const candidate = truth + (next() < 0.5 ? -drift : drift);
    // Century 0 does not exist in this labelling (1 BCE is followed by 1 CE),
    // and an option nobody could pick is a wasted slot.
    if (candidate !== truth && candidate !== 0) {
      wrong.add(candidate);
    }
  }
  if (wrong.size < 3) {
    return null;
  }

  const choices = shuffle(
    [
      { id: 'c-correct', text: centuryLabel(truth), isCorrect: true },
      ...[...wrong].map((c, i) => ({ id: `c${i}`, text: centuryLabel(c), isCorrect: false })),
    ],
    next,
  );

  return {
    id: `gen-century-${event.id}`,
    scenario: briefFor(event),
    prompt: 'Which century does this belong to?',
    choices,
    butterflyEffect: revealFor(event),
  };
}

/**
 * Every question this event can support, best first. An event with an authored
 * scenario returns that pool untouched — a keyword-built drill must never
 * displace copy someone wrote on purpose.
 *
 * Four kinds rather than two, because two was not enough: an event yields at
 * most one question per kind, so a reader who drilled the same event three
 * times exhausted it and started seeing repeats. Ordered by how much each one
 * teaches — a year, then the day's other events, then chronology, then the
 * century fallback for antiquity.
 */
/**
 * Does an authored pool exist for this event?
 *
 * The published manifest carries the FACT without the content — the questions
 * themselves are 2 MB gzipped and live in a separate file fetched when a quiz
 * starts. So an event can legitimately be authored and have an empty
 * `quizPool` right up until that fetch lands, and every caller that scores or
 * filters by "has authored questions" has to ask this rather than measure the
 * array. The bundled fixture keeps its pools inline, hence both halves.
 */
export function hasAuthoredQuiz(event: HistoricalEvent): boolean {
  return event.authored === true || event.quizPool.length > 0;
}

export function questionsFor(
  event: HistoricalEvent,
  pool: readonly HistoricalEvent[],
): ScenarioQuestion[] {
  if (event.quizPool.length > 0) {
    return event.quizPool;
  }
  return [
    yearQuestion(event),
    whichEventQuestion(event, pool),
    whichFirstQuestion(event, pool),
    centuryQuestion(event),
  ].filter((q): q is ScenarioQuestion => q !== null);
}

/** True for a question this module invented, so the UI can label it honestly. */
export function isGeneratedQuestion(question: ScenarioQuestion): boolean {
  return question.id.startsWith('gen-');
}

/**
 * True when the event's own picture, shown BEFORE the answer, would give it away.
 *
 * Compromised are the two kinds whose OPTIONS ARE EVENT TITLES — which-event
 * and which-came-first. The picture is a portrait of the right one, so anyone
 * who recognises Grace Kelly or a mushroom cloud has been handed the answer,
 * and a question you cannot get wrong teaches nothing.
 *
 * The year and century questions survive it. Archival art dates an event to an
 * era, and the wrong answers sit within a few years or a few centuries of the
 * truth — era-level hinting does not settle either. An authored scenario wants
 * the picture most of all: it is the establishing shot.
 *
 * After the answer, everything shows its picture. Nothing is left to protect.
 */
export function imageWouldRevealAnswer(question: ScenarioQuestion): boolean {
  return question.id.startsWith('gen-which-') || question.id.startsWith('gen-first-');
}

/** Epoch-day a question was last answered, or null if it never was. */
export type SeenLookup = (questionId: string) => number | null;

/**
 * Re-order a pool so the questions this reader has never answered come first,
 * then the longest-unseen.
 *
 * The archive repeats by design — a calendar of history comes round every year.
 * The QUESTION must not: being asked the identical question with the identical
 * four choices reads as the app having run out of material, and it teaches
 * nothing the second time, because the reader recognises the answer's shape
 * instead of recalling the history.
 *
 * Stable within each group, so an authored scenario still outranks a generated
 * recall drill when neither has been seen — a sighting date can push a question
 * down the list but never promote one above better copy.
 *
 * Pure, and takes the lookup as an argument rather than reading a store, so the
 * rule can be exercised without mounting anything.
 */
export function freshestFirst(
  questions: readonly ScenarioQuestion[],
  seenAt: SeenLookup,
): ScenarioQuestion[] {
  return questions
    .map((question, index) => ({ question, index, seen: seenAt(question.id) }))
    .sort((a, b) => (a.seen ?? -1) - (b.seen ?? -1) || a.index - b.index)
    .map((entry) => entry.question);
}
