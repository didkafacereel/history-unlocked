/**
 * Lite conversion — a feed candidate becomes an app event with NO language
 * model involved. This is what lets every one of the 366 days carry real,
 * verified, illustrated content today, for free.
 *
 * Trade-offs versus the enriched path, stated plainly:
 *  - The facts are quoted from the Wikipedia extract (CC BY-SA), so the event
 *    carries a `textCredit` and the card shows it. Our own voice comes later.
 *  - No scenario quiz (the quiz needs authored distractors and a butterfly
 *    effect — not something to fake).
 *  - `region` is the page's one-line description, which is informative but not
 *    always a place. The enriched pass replaces it.
 * When the LLM pass later runs for the same date, it replaces these entries.
 */
import { EventCategory, FactBlock } from '../src/types/manifest';
import { EventCandidate } from './onthisday';

type Era = 'Ancient' | 'Classical' | 'Medieval' | 'Early Modern' | 'Industrial' | 'Modern';

export function eraForYear(year: number): Era {
  if (year < -800) return 'Ancient';
  if (year < 500) return 'Classical';
  if (year < 1500) return 'Medieval';
  if (year < 1800) return 'Early Modern';
  if (year < 1914) return 'Industrial';
  return 'Modern';
}

/**
 * Keyword routing. Ordered from most specific to broadest so a "battle" is
 * military even if the sentence also mentions a king.
 */
const CATEGORY_RULES: [EventCategory, RegExp][] = [
  // First: a state coming into being (or ending) outranks the battle or treaty
  // that produced it — "the Kingdom of Italy was proclaimed" is a founding,
  // not a war story.
  [
    'Nations & Empires',
    /\b(declared independence|gained independence|independence from|proclaim\w* the (kingdom|republic|empire|state)|(kingdom|republic|empire|federation|confederation|caliphate|sultanate|khanate|dynasty|principality|duchy)\s+(of\s+[\w' -]+\s+)?(was|is|were)\s+(founded|established|proclaimed|created|formed|dissolved)|founding of (the )?(kingdom|republic|empire|state|nation)|unification of|partition of|dissolution of|secede|annexed by|became a (republic|kingdom|sovereign|nation|state)|admitted to the union|statehood)/,
  ],
  ['Military & Conflict', /\b(battle|war\b|wars\b|army|troops|siege|invasion|invaded|fleet|naval|bomb|attack|forces|regiment|surrender|offensive|garrison|armistice|uprising|rebellion|revolt|mutiny|captured|conquer|defeated)/],
  ['Disaster & Tragedy', /\b(earthquake|flood|crash|crashed|killed|disaster|wildfire|hurricane|typhoon|cyclone|tsunami|explosion|exploded|sank|collapsed|famine|eruption|derail|massacre|epidemic|pandemic)/],
  ['Sports & Games', /\b(olympic|championship|world cup|grand prix|tournament|footballer|gold medal|marathon|wimbledon|world record|boxing|cricket|baseball|chess)/],
  ['Science & Technology', /\b(discover|launched|satellite|patent|telescope|experiment|vaccine|physicist|astronom|invent|orbit|spacecraft|nasa|element|transistor|computer|nuclear|rocket|probe)/],
  ['Exploration & Discovery', /\b(expedition|voyage|explorer|summit|landed|circumnavigat|sailed|reached the|first ascent|antarctic|arctic|founded|settlement|colonis|coloniz|oldest continuously)/],
  ['Society & Rights', /\b(rights|protest|abolish|suffrage|segregat|slavery|strike\b|apologi[sz]|boycott|emancipat|riot|demonstrat)/],
  ['Politics & Power', /\b(king|queen|emperor|empress|president|elected|treaty|parliament|crowned|republic|constitution|coup|prime minister|sultan|pope|dynasty|independence|assassinat|sovereign)/],
  ['Culture & Ideas', /\b(premiere|cantata|novel|painting|film|opera|published|composer|symphony|theatre|theater|released|album|poem|cathedral|university)/],
];

export function categoryFor(summary: string): EventCategory {
  const text = summary.toLowerCase();
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(text)) return category;
  }
  return 'Culture & Ideas';
}

/**
 * Events where the death toll IS the event.
 *
 * Split in two because they justify themselves differently. The first list is
 * deliberate mass killing — no reading of context can make confetti acceptable
 * over it. The second is a stated toll: "killed 3,000", "left 900 dead". A
 * number that large in the sentence is the sentence.
 *
 * Deliberately narrow. Over-marking would drain the app of its ordinary
 * cheerfulness; the test is not "was this sad" but "would a progress bar over
 * this be indecent". Wars, defeats, assassinations and single deaths stay
 * standard — history is full of them and the app must be able to hold them.
 */
const SOLEMN_SUBJECT =
  /\b(genocide|holocaust|massacr|atrocit|ethnic cleansing|pogrom|death camp|concentration camp|extermination|famine|lynch|terrorist attack|suicide bombing|mass shooting|war crime|slave trade|deported to their deaths|martyrdom)\b/;

const SOLEMN_TOLL =
  /\b(killing (at least |some |an estimated |more than |over )?[\d,]{3,}|[\d,]{3,} (people |civilians |passengers |soldiers )?(were )?(killed|died|dead|perished)|death toll|leaving [\d,]{3,} dead)\b/;

export function sensitivityFor(text: string): 'standard' | 'solemn' {
  const lower = text.toLowerCase();
  return SOLEMN_SUBJECT.test(lower) || SOLEMN_TOLL.test(lower) ? 'solemn' : 'standard';
}

const ICONS: Record<EventCategory, string> = {
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

const TITLE_MAX = 90;

/**
 * Words a headline must never end on — the reader is left waiting for the rest.
 *
 * Only words that CANNOT close a clause. "over", "under", "before" and "after"
 * were in an earlier version of this list and had to come out: "the Sierra
 * Leone Civil War is declared over" and "to keep the Leaning Tower of Pisa from
 * toppling over" are finished sentences, and trimming them produced nonsense.
 *
 * Lower case only, too: case-insensitively this ate the "A" from "MV Karine A",
 * the ship's name, because "a" is an article.
 */
const DANGLING =
  /\s+(and|or|but|nor|the|a|an|of|in|on|at|to|from|with|by|for|as|its|his|her|their|our|into|onto|which|that|whose|than)$/;

/**
 * Tidy a cut so it reads as a finished phrase.
 *
 * Two failures, both of them visible on 57 cards before this existed. An
 * opening bracket whose partner fell off the end left "Francisco Pizarro
 * founded Ciudad de los Reyes (present-day Lima" on screen; cutting at a comma
 * that happened to follow a conjunction left "…resigns as leader of the
 * Conservative Party and".
 */
function tidyCut(text: string): string {
  let out = text.trim();

  for (const [open, close] of [
    ['(', ')'],
    ['[', ']'],
  ] as const) {
    let depth = 0;
    let openedAt = -1;
    for (let i = 0; i < out.length; i++) {
      if (out[i] === open) {
        if (depth === 0) openedAt = i;
        depth++;
      } else if (out[i] === close) {
        depth = Math.max(0, depth - 1);
        if (depth === 0) openedAt = -1;
      }
    }
    // A bracket still open at the end means the parenthetical was cut in half.
    // Drop it entirely: the words before it are the headline.
    if (depth > 0 && openedAt >= 0) {
      out = out.slice(0, openedAt).trim();
    }
  }

  out = out.replace(/[,;:–—-]+$/, '').trim();
  while (DANGLING.test(out)) {
    out = out.replace(DANGLING, '').replace(/[,;:]+$/, '');
  }
  return out.trim();
}

/**
 * The feed's summary is a full sentence; the card wants a headline. Prefer
 * cutting at a clause boundary so the result still reads as a phrase.
 */
export function titleFromSummary(summary: string): string {
  const clean = summary
    .replace(/\s*\(pictured\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.]+$/, '');
  // `|| clean` because tidying can empty a scrap like "(" and the schema wants
  // at least one character. An EMPTY summary still yields an empty title, on
  // purpose: that event has no content, and the Zod gate at publish should say
  // so rather than have this invent a headline.
  if (clean.length <= TITLE_MAX) return tidyCut(clean) || clean;

  const head = clean.slice(0, TITLE_MAX);
  const boundary = Math.max(
    head.lastIndexOf(', '),
    head.lastIndexOf('; '),
    head.lastIndexOf(' — '),
    head.lastIndexOf(' – '),
  );
  if (boundary > 40) {
    const cut = tidyCut(head.slice(0, boundary));
    // Only if tidying left enough to be a headline; otherwise fall through to
    // the word-boundary cut below, which keeps more of the sentence.
    if (cut.length > 40) return cut;
  }

  const space = head.lastIndexOf(' ', TITLE_MAX - 2);
  const cut = tidyCut(head.slice(0, space > 40 ? space : TITLE_MAX - 1));
  return `${cut}…`;
}

const FACT_MAX = 160;

const FACT_MIN = 25;

/**
 * Encyclopedia prose often opens with one very long sentence. Discarding those
 * outright left a third of all events with a single fact — visibly thin on a
 * card. Instead, keep the sentence's opening clause, which almost always reads
 * as a complete thought on its own. Trailing fragments are dropped rather than
 * shown, since a fact starting mid-clause looks like a bug.
 */
function cardSizedClause(sentence: string): string | null {
  if (sentence.length <= FACT_MAX) {
    return sentence.length >= FACT_MIN ? sentence : null;
  }

  const head = sentence.slice(0, FACT_MAX);
  const cut = Math.max(
    head.lastIndexOf('; '),
    head.lastIndexOf(', '),
    head.lastIndexOf(' — '),
    head.lastIndexOf(' – '),
  );
  if (cut < FACT_MIN) {
    return null;
  }
  return `${head.slice(0, cut).trim()}…`;
}

/** Split prose into card-sized facts. */
export function factsFromText(text: string, icon: string, max = 4): FactBlock[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)
    .map((s) => s.trim());

  const facts: string[] = [];
  for (const sentence of sentences) {
    if (facts.length >= max) break;
    const clause = cardSizedClause(sentence);
    if (clause) {
      facts.push(clause);
    }
  }

  return facts.map((sentence, i) => ({ id: `f${i + 1}`, icon, text: sentence }));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    // Strip combining diacritics so "Thích Quảng Đức" slugs cleanly.
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export interface LiteImage {
  imageUrl: string;
  credit: string;
  sourceUrl: string;
  aspect: number;
}

/**
 * Event ids MUST carry the date.
 *
 * They did not, and it silently gutted the archive. The feed links most wartime
 * entries to the same hub article, so 6 June 1944 and 2 January 1944 both
 * produced `evt-1944-world-war-ii` — and because the database is one map keyed
 * by id, and a full run walks January first, the second date's event was
 * dropped as a duplicate. January quietly owned the year's most famous events:
 * no D-Day on 6 June, no Pearl Harbor on 7 December, no Hiroshima on 6 August.
 *
 * Within a single date the feed is already deduped by article, so date + year +
 * article is unique by construction.
 */
function eventId(candidate: EventCandidate, dateKey: string): string {
  const yearSlug = candidate.year < 0 ? `bce${Math.abs(candidate.year)}` : String(candidate.year);
  return `evt-${dateKey}-${yearSlug}-${slugify(candidate.wikiTitle)}`;
}

/** Assemble the event object; the caller validates it through the Zod schema. */
export function liteEventFrom(candidate: EventCandidate, dateKey: string, image: LiteImage) {
  const category = categoryFor(candidate.summary);
  const icon = ICONS[category];

  let facts = factsFromText(candidate.extract, icon);
  if (facts.length === 0) {
    facts = factsFromText(candidate.summary.replace(/\s*\(pictured\)/gi, ''), icon, 1);
  }
  if (facts.length === 0) {
    // Extremely short entry: the summary itself, hard-trimmed, is still a fact.
    facts = [{ id: 'f1', icon, text: candidate.summary.slice(0, FACT_MAX) }];
  }

  return {
    id: eventId(candidate, dateKey),
    dateKey,
    year: candidate.year,
    era: eraForYear(candidate.year),
    category,
    sensitivity: sensitivityFor(`${candidate.summary} ${candidate.extract}`),
    ...(candidate.cornerstone ? { cornerstone: true } : {}),
    title: titleFromSummary(candidate.summary),
    region: candidate.description ?? candidate.wikiTitle,
    wikiTitle: candidate.wikiTitle,
    coordinates: candidate.coordinates,
    imageUrl: image.imageUrl,
    imageCredit: image.credit,
    imageSourceUrl: image.sourceUrl,
    imageAspect: image.aspect,
    textCredit: 'Text: Wikipedia · CC BY-SA 4.0',
    summary: candidate.extract.trim() || undefined,
    facts,
    quizPool: [],
  };
}
