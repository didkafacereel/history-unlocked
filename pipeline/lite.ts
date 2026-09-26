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
import { shortHeadline, TITLE_MAX } from './headline';
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

/**
 * A bracket counts as a transcription when it holds a character only IPA uses:
 * the IPA Extensions and Spacing Modifier blocks (ʁ ə ɑ ˈ ː …) plus the few
 * Latin letters IPA borrows. Accented Latin alone is not enough — "[sic]" and
 * "[Fr. château]" are editorial and stay.
 */
const IPA_CHAR = /[ɐ-˿ᴀ-ᶿæðøœθŋχβ]/;

/**
 * The transcription, with any label before it and any lowercase respelling
 * after it: "Nguyễn Phú Trọng (Vietnamese: [ŋwiən˦ˀ˥ …] new-yen foo chong;".
 */
const IPA_BRACKET =
  /(,?\s*(?:pronounced|(?:[A-Z][\w-]* )?pronunciation:))?\s*\[([^[\]]*)\](?: [a-z]+-[a-z]+(?:[ -][a-z]+)*(?=[;,)]))?/g;

/**
 * An English transcription between slashes: "Jiddu Krishnamurti (pronounced
 * /ˈdʒɪduː ˌkrɪʃnəˈmʊərti/; 11 May 1895". Standalone slashes only, so
 * "and/or" and "km/h" never match.
 */
const IPA_SLASHES = /(,?\s*pronounced)?\s*(?<![\w/])\/([^/]{1,80})\/(?![\w/])/g;

/**
 * Wikipedia wrote "(German pronunciation: [ɪntɛliˈɡɛnt͡s.akˌt͡sjoːn] was a
 * series…" and never closed the bracket. Removing the transcription leaves
 * "( was", so an opener whose only content was the transcription, with no
 * closing bracket before the sentence ends, goes with it.
 */
const ORPHAN_OPENER =
  /\s*\((?:[A-Z][\w-]*(?: [\w-]+)?:\s*|pronounced\s+)?\[([^[\]]*)\]\s*(?=\w[^()]*?(?:[.!?](?:\s|$)|$))/g;

/** "UK:", "Latin American Spanish:" — a language label left holding nothing. */
const EMPTY_LABEL = /(?<=[(;,]\s*)[A-Za-z][\w-]*(?: [A-Za-z][\w-]*){0,2}:\s*(?=[,;)]|$)/g;

/**
 * Labels that only ever introduce an English pronunciation: "UK:", "US also",
 * "also US:", "English:", "commonly". A native name has its language instead.
 */
const RESPELL_LABEL = /^\s*(?:(?:also|or|commonly)\s+)?(?:(?:UK|US|English)(?::|\s+also\b:?)\s*)?(?:(?:also|or|commonly)\b\s*)?/;

/** The respell template joins a continuation to its hyphen: "-mahn". */
const WORD_JOINER = /\u2060/g;

/**
 * Hyphen words whose caps part is an acronym and not a stressed syllable:
 * "KGB-backed", "pro-EU", "anti-NATO".
 */
const ACRONYM_COMPOUND =
  /^(?:pro|anti|non|post|pre|ex|neo|sub|mid|inter|trans|pan|ultra|semi|multi|cross)-|-(?:led|backed|based|born|era|style|type|class|owned|run|made|like|wide|free|level|related|speaking|controlled|dominated|occupied|funded|affiliated|aligned|allied|era)$/;

/**
 * "SHAR-lə-mayn", "GA(H)N-dee", "MEER-": every syllable wholly upper or wholly
 * lower case. Real words are Capitalised, so "II-Birkenau", "All-NBA" and
 * "Waffen-SS" fail.
 */
function isUniformHyphenWord(word: string): boolean {
  const parts = word.replace(WORD_JOINER, '').split('-');
  return parts.length > 1 && parts.every((p) => /^[a-zə()]*$/.test(p) || /^[A-Z()]*$/.test(p));
}

/** A word only a respelling or a bare transcription would contain. */
function isStrongRespelling(word: string, gap: boolean): boolean {
  if (/\u2060/.test(word)) return true;
  // A bare or /slashed/ transcription: IPA letters, never capitals.
  if (/[ɐ-ʯˈˌː]/.test(word) && !/[A-Z]/.test(word)) return true;
  // "YAY", "BRA(H)K": one stressed syllable, told from an acronym by the gap.
  if (/^[A-Z]{2,}$/.test(word.replace(/[()]/g, ''))) return gap;
  // A stressed syllable in capitals next to an unstressed one in lower case,
  // or a fragment ("MEER-"); all capitals is an acronym: "TNI-AD", "EBR-I".
  return (
    isUniformHyphenWord(word) &&
    /[A-Z]{2,}/.test(word.replace(/[()]/g, '')) &&
    (/[a-zə]/.test(word) || /^-|-$/.test(word)) &&
    !ACRONYM_COMPOUND.test(word.toLowerCase())
  );
}

/** "lə", "von", "or", "-": the small words between stressed syllables. */
function isRespellingWord(word: string, gap: boolean): boolean {
  return (
    isStrongRespelling(word, gap) ||
    /^[a-zə]{1,8}$/.test(word) ||
    /^[-\u2060]+$/.test(word) ||
    /^[A-Z]{2,}$/.test(word) ||
    isUniformHyphenWord(word)
  );
}

/**
 * One item between separators in a parenthetical, or '' if it was a
 * respelling. `open` says the item may be one: it sits in the lead
 * parenthetical, in one opened by the gap an audio link left, or after a
 * pronunciation label.
 */
function dropRespellingItem(item: string, open: boolean, gap: boolean): string {
  const label = RESPELL_LABEL.exec(item)?.[0] ?? '';
  const rest = item.slice(label.length).trim();
  // "Piet Mondrian (, US also ;", "Anne Brontë (, commonly ;": the label
  // outlived its respelling.
  if (rest === '' && /also|commonly|:/.test(label)) return '';
  if (!open && !/\b(?:UK|US|English)\b/.test(label)) return item;

  const words = rest.split(/\s+/);
  if (words.every((w) => isRespellingWord(w, gap))) {
    if (words.some((w) => isStrongRespelling(w, gap))) return '';
    // "Luigi Galvani ( gal-VAH-nee, US also gahl-;": unstressed, but labelled.
    if (/\b(?:UK|US)\b/.test(label) && words.some((w) => w.includes('-'))) return '';
  }
  // "Dr. Seuss ( sooss, zooss)", "Thomas Browne ( "brown";": a one-syllable
  // respelling has no capitals, so only the gap says what it is.
  if (gap && words.length === 1 && /^["“]?[a-z]{2,8}["”]?$/.test(words[0]!)) return '';
  // "born Kanye Omari West KAHN-yay oh-MAH-ree": a respelling after the name.
  let keep = words.length;
  while (keep > 1 && words[keep - 1]!.includes('-') && isStrongRespelling(words[keep - 1]!, false)) keep--;
  if (keep === words.length) return item;
  return item.slice(0, item.lastIndexOf(words[keep - 1]!) + words[keep - 1]!.length);
}

/**
 * The respell template ("kam-OO", "KROH-bər lə GWIN") comes through the
 * extract as plain words, usually after a gap where its audio link was: "Albert
 * Camus ( kam-OO; French: …". Each top-level parenthetical is split at its
 * separators and any item that is wholly a respelling goes; the separators it
 * leaves are collapsed with the rest.
 */
function dropRespellings(text: string): string {
  let out = '';
  let from = 0;
  let lead = true;
  for (let open = text.indexOf('(', from); open >= 0; open = text.indexOf('(', from)) {
    let depth = 1;
    let close = open + 1;
    for (; close < text.length && depth > 0; close++) {
      if (text[close] === '(') depth++;
      if (text[close] === ')') depth--;
    }
    const end = depth === 0 ? close - 1 : text.length;
    const inner = text.slice(open + 1, end);
    const gap = /^[\s,;]/.test(inner);

    const items: string[] = [];
    // "Raphael (UK: RAF-ay-əl, US: RAF-ee-əl, RAY-fee-, RAH-fy-EL)": after one
    // respelling the next item may be another, label or not.
    let after = false;
    const drop = (text: string) => {
      const kept = dropRespellingItem(text, lead || gap || after, gap);
      after = kept === '' && text.trim() !== '';
      return kept;
    };
    let item = '';
    let level = 0;
    for (const ch of inner) {
      if (ch === '(') level++;
      if (ch === ')') level--;
      if (level === 0 && (ch === ';' || ch === ',')) {
        items.push(drop(item), ch);
        item = '';
      } else {
        item += ch;
      }
    }
    items.push(drop(item));

    out += text.slice(from, open + 1) + items.join('');
    from = end;
    lead = false;
  }
  return out + text.slice(from);
}

/**
 * "Sumqayit; ; is a city", "Empress Maud,, or Athelicia": what stood between
 * them was an aside, and a comma is what an aside leaves behind. Inside a
 * bracket the groups were semicolon-separated, so "Róża Luksemburg ; ; 5 March
 * 1871" keeps its semicolon.
 */
function collapseSeparators(text: string): string {
  return text.replace(/\s*[,;](?:\s*[,;])+/g, (run: string, at: number) => {
    const before = text.slice(0, at);
    const inside = (before.match(/\(/g)?.length ?? 0) > (before.match(/\)/g)?.length ?? 0);
    return inside && run.includes(';') ? ';' : ',';
  });
}

/**
 * Strip what the pronunciation templates leave in a plain-text extract.
 *
 * The REST extract drops the audio and respelling templates but keeps their
 * punctuation, so a lead sentence arrives as "Roald Amundsen (UK: , US: ;
 * Norwegian: [ˈrùːɑɫ ˈɑ̂mʉnsən] ; 16 July 1872 – …)". That opens the lead card.
 *
 * Removes transcriptions and the labels that introduced them, then English
 * respellings, then the empty labels and stray separators they leave, then any
 * bracket left empty. Every parenthetical with words in it survives: "born
 * Alexander Bell", the dates, "German: Reichstagsbrand", "French: Prise de la
 * Bastille".
 */
export function stripPronunciation(text: string): string {
  const isIpa = (inner: string) => IPA_CHAR.test(inner);
  const out = collapseSeparators(
    dropRespellings(
      text
        .replace(ORPHAN_OPENER, (m: string, inner: string) => (isIpa(inner) ? ' ' : m))
        .replace(IPA_BRACKET, (m: string, _label: string | undefined, inner: string) =>
          isIpa(inner) ? '' : m,
        )
        .replace(IPA_SLASHES, (m: string, _label: string | undefined, inner: string) =>
          isIpa(inner) ? '' : m,
        ),
    )
      .replace(EMPTY_LABEL, '')
      // "Daniel Defoe ( c. 1660": an opener followed by space is always a gap.
      .replace(/\((?:\s*[,;])*\s*/g, '(')
      .replace(/(?:\s*[,;])+\s*\)/g, ')'),
  )
    // "Балакирев ; 2 January": the space belonged to the transcription.
    .replace(/ +(?=[,;])/g, '')
    .replace(/\s*\(\s*\)/g, '');
  return dropStrayClosers(out).replace(/ {2,}/g, ' ').trim();
}

/**
 * "The Goiânia accident ), also known…" — the template took its own opening
 * bracket and left the closing one. Only a closer with whitespace before it
 * and nothing open to close is removed; "1)" in a list keeps its bracket.
 */
function dropStrayClosers(text: string): string {
  let depth = 0;
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    if (ch === ')') {
      if (depth > 0) {
        depth--;
        // A space before a closer that does close something is the template's
        // too: "Reichstagsbrand )".
        out = out.trimEnd();
      } else if (/\s$/.test(out)) {
        out = out.trimEnd();
        continue;
      }
    }
    out += ch;
  }
  return out;
}

// The headline rules (90 characters, what may be cut and what may not) live in
// ./headline.ts, shared with repair-truncated-titles.ts.

/**
 * The feed's summary is a full sentence; the card wants a headline. Prefer
 * cutting at a clause boundary so the result still reads as a phrase.
 */
export function titleFromSummary(summary: string): string {
  // Delegated since 26 September: the plain 90-character cut left 44% of the
  // archive ending in "…". `shortHeadline` removes parentheticals, a leading
  // context label, appositives and trailing subordinate clauses first, and cuts
  // at a word only when nothing else fits — see pipeline/headline.ts. An EMPTY
  // summary still yields an empty title, on purpose: that event has no content,
  // and the Zod gate at publish should say so rather than have this invent one.
  return shortHeadline(summary, TITLE_MAX);
}

/**
 * 220, not 160, and the difference is measured.
 *
 * At 160 a third of every fact in the archive ended in an ellipsis, because
 * the only clause boundary inside the window often fell before the sentence's
 * main verb: "The September 2019 climate strikes, also known as the Global
 * Week for Future…" says nothing about what happened. Widening the window to
 * 220 reaches the next boundary, after "…to address climate change", and the
 * sentence stands up.
 *
 * Swept over the published archive: facts ending in an ellipsis fall from
 * 30.0% to 6.9% while density is unchanged — 3.01 facts per event against
 * 3.02, the same 93 events with none and 707 with one. It buys accuracy for
 * nothing, which is why it is worth changing a cap that reads like a design
 * decision.
 */
const FACT_MAX = 220;

const FACT_MIN = 25;

/**
 * How much of the window a cut must keep to be worth showing.
 *
 * A boundary at 40% of the cap is throwing away most of the sentence, and what
 * it throws away is usually the verb. Below this the sentence is skipped
 * entirely and the next one is tried — the caller keeps going until the card
 * has its facts, so a rejected sentence costs nothing but a better one.
 */
const FACT_MIN_KEEP = 0.7;

/**
 * Encyclopedia prose often opens with one very long sentence. Discarding those
 * outright left a third of all events with a single fact — visibly thin on a
 * card. Instead, keep the sentence's opening clause, which almost always reads
 * as a complete thought on its own. Trailing fragments are dropped rather than
 * shown, since a fact starting mid-clause looks like a bug — and one ENDING
 * mid-clause is the same bug seen from the other side.
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
  if (cut < FACT_MIN || cut / FACT_MAX < FACT_MIN_KEEP) {
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
  // Cleaned once, here, because the title, the facts and the stored summary
  // are all cut from these two strings. A cornerstone's summary is the
  // extract's first sentence, so it carries the same markup.
  const summary = stripPronunciation(candidate.summary);
  const extract = stripPronunciation(candidate.extract);
  const category = categoryFor(summary);
  const icon = ICONS[category];

  let facts = factsFromText(extract, icon);
  if (facts.length === 0) {
    facts = factsFromText(summary.replace(/\s*\(pictured\)/gi, ''), icon, 1);
  }
  if (facts.length === 0) {
    // Extremely short entry: the summary itself, hard-trimmed, is still a fact.
    facts = [{ id: 'f1', icon, text: summary.slice(0, FACT_MAX) }];
  }

  return {
    id: eventId(candidate, dateKey),
    dateKey,
    year: candidate.year,
    era: eraForYear(candidate.year),
    category,
    sensitivity: sensitivityFor(`${summary} ${extract}`),
    ...(candidate.cornerstone ? { cornerstone: true } : {}),
    title: titleFromSummary(summary),
    region: candidate.description ?? candidate.wikiTitle,
    wikiTitle: candidate.wikiTitle,
    coordinates: candidate.coordinates,
    imageUrl: image.imageUrl,
    imageCredit: image.credit,
    imageSourceUrl: image.sourceUrl,
    imageAspect: image.aspect,
    textCredit: 'Text: Wikipedia · CC BY-SA 4.0',
    summary: extract || undefined,
    facts,
    quizPool: [],
  };
}
