/**
 * Who was born and who died on a date — the half of "on this day" we ignored.
 *
 * The Wikimedia feed returns roughly 220 births and 110 deaths for every
 * calendar date, all with an article and a Wikidata one-liner, and none of it
 * cost us anything to fetch. The whole problem is CHOOSING: a list of five
 * people is only worth reading if they are the right five.
 *
 * Article length, the obvious free signal, is a bad one. On 15 April it ranks a
 * geographer with a 909-character lead above Leonhard Euler with 823, because
 * lead-paragraph length measures how someone wrote an article, not how much the
 * world cares. **Wikidata sitelink count** — the number of language editions
 * that bothered to write about this person — is the signal that works: Euler
 * 191, Brunelleschi 69, a rugby player 3. It is free, keyless, batched, and
 * returns a complete number rather than a truncated list (which is why
 * `prop=langlinks` is not used here: its 500-item limit is spent across the
 * whole request, so later titles come back as zero).
 */
import { fetchJson } from './archival';
import { fetchArticleExtracts, resolveImagesBatch } from './imagery';

const FEED_BASE = 'https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all';
const WIKI_API = 'https://en.wikipedia.org/w/api.php';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

/** Both endpoints accept 50 identifiers per request. */
const BATCH = 50;

/**
 * How many candidates get ranked properly. Article length is a poor measure of
 * fame but a fine net: nobody famous has a short article, so trimming the tail
 * this way cannot lose anyone who would have made the final list.
 */
const SHORTLIST = 50;

export interface PersonEntry {
  year: number;
  name: string;
  description: string;
  wikiTitle: string;
  imageUrl?: string;
  imageCredit?: string;
  imageSourceUrl?: string;
  summary?: string;
}

export interface DayRegister {
  dateKey: string;
  births: PersonEntry[];
  deaths: PersonEntry[];
  observances: string[];
}

interface FeedPage {
  titles?: { normalized?: string };
  extract?: string;
  description?: string;
  type?: string;
}

interface FeedEntry {
  year?: number;
  text?: string;
  pages?: FeedPage[];
}

interface PeopleFeed {
  births?: FeedEntry[];
  deaths?: FeedEntry[];
  holidays?: FeedEntry[];
}

interface Candidate extends PersonEntry {
  extractLength: number;
}

const MAX_DESCRIPTION = 120;

/**
 * Portrait width. Small on purpose: these are 44px rows and a tap-through
 * sheet, not backdrops, and 366 days of URLs ride in the manifest.
 */
const PORTRAIT_WIDTH = 480;

/** Room for two or three sentences in the tap-through sheet. */
const MAX_SUMMARY = 480;

/** Trim a lead section to whole sentences rather than mid-word. */
function trimToSentences(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) {
    return clean;
  }
  const head = clean.slice(0, max);
  const lastStop = head.lastIndexOf('. ');
  return lastStop > 80 ? head.slice(0, lastStop + 1) : `${head.trim()}…`;
}

/**
 * Attach a free-licensed portrait and a short biography to the people we chose.
 *
 * Only the final nine, never the shortlist: resolving fifty candidates would
 * cost the same three requests but throw four-fifths of the answer away.
 * Anything without a free image simply keeps `imageUrl` undefined — the card
 * draws a monogram, and no unlicensed picture ever ships.
 */
async function enrich(people: PersonEntry[]): Promise<PersonEntry[]> {
  const titles = [...new Set(people.map((p) => p.wikiTitle))];
  if (titles.length === 0) {
    return people;
  }

  const [images, extracts] = await Promise.all([
    resolveImagesBatch(titles, PORTRAIT_WIDTH),
    fetchArticleExtracts(titles),
  ]);

  return people.map((person) => {
    const image = images.get(person.wikiTitle);
    const extract = extracts.get(person.wikiTitle);
    return {
      ...person,
      ...(image
        ? {
            imageUrl: image.imageUrl,
            imageCredit: image.credit,
            imageSourceUrl: image.sourceUrl,
          }
        : {}),
      ...(extract ? { summary: trimToSentences(extract, MAX_SUMMARY) } : {}),
    };
  });
}

/**
 * The feed sometimes links a birth or death to the article for the YEAR rather
 * than for the person — "AD 81 · Calendar year" turned up under "died on this
 * day" on 13 September. A register is a list of people; anything that is
 * plainly not one is dropped rather than shown.
 *
 * Matched on Wikidata's own description (and on titles that are nothing but a
 * year), because that description is the same string the row would display —
 * if it says "calendar year", the row would too.
 */
const NOT_A_PERSON =
  /^(calendar year|year|decade|century|millennium|disambiguation|list of|wikimedia (list|disambiguation|category))/i;
const YEAR_TITLE = /^(ad\s+)?\d{1,4}(\s+bc)?$/i;

function toCandidate(entry: FeedEntry): Candidate | null {
  const page = entry.pages?.find((p) => p.titles?.normalized && p.type !== 'disambiguation');
  const name = page?.titles?.normalized;
  const description = page?.description?.trim();
  // No one-liner means no readable row — the name alone tells a reader nothing.
  if (!name || !description || entry.year === undefined) {
    return null;
  }
  if (NOT_A_PERSON.test(description) || YEAR_TITLE.test(name)) {
    return null;
  }
  return {
    year: entry.year,
    name,
    description: description.slice(0, MAX_DESCRIPTION),
    wikiTitle: name,
    extractLength: (page?.extract ?? '').length,
  };
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

interface PagePropsResponse {
  query?: { pages?: { title?: string; pageprops?: { wikibase_item?: string } }[] };
}

interface EntitiesResponse {
  entities?: Record<string, { sitelinks?: Record<string, unknown> }>;
}

/**
 * article title → number of language editions carrying it. Titles that resolve
 * to no Wikidata entity are simply absent, and rank last.
 */
async function sitelinkCounts(titles: readonly string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  for (const group of chunk(titles, BATCH)) {
    const propsUrl =
      `${WIKI_API}?action=query&format=json&formatversion=2&prop=pageprops` +
      `&ppprop=wikibase_item&titles=${encodeURIComponent(group.join('|'))}`;
    const props = await fetchJson<PagePropsResponse>(propsUrl);

    const qidByTitle = new Map<string, string>();
    for (const page of props.query?.pages ?? []) {
      const qid = page.pageprops?.wikibase_item;
      if (page.title && qid) {
        qidByTitle.set(page.title, qid);
      }
    }
    if (qidByTitle.size === 0) {
      continue;
    }

    const ids = [...qidByTitle.values()];
    const wdUrl = `${WIKIDATA_API}?action=wbgetentities&format=json&props=sitelinks&ids=${ids.join('|')}`;
    const wd = await fetchJson<EntitiesResponse>(wdUrl);

    for (const [title, qid] of qidByTitle) {
      counts.set(title, Object.keys(wd.entities?.[qid]?.sitelinks ?? {}).length);
    }
  }

  return counts;
}

/**
 * Religious feast days dominate the holiday list — 6 of the 8 entries on a
 * typical date — and they read as noise next to "Day of the Sun (North Korea)".
 * They are also multi-line, which no single row can hold.
 */
const LITURGICAL = /feast day|liturgic|saints? day|commemoration of/i;
const MAX_OBSERVANCES = 3;

function observancesFrom(entries: readonly FeedEntry[]): string[] {
  return entries
    .map((e) => (e.text ?? '').replace(/\s+/g, ' ').trim())
    .filter((text) => text.length > 0 && text.length <= MAX_DESCRIPTION && !LITURGICAL.test(text))
    .slice(0, MAX_OBSERVANCES);
}

const byLengthDesc = (a: Candidate, b: Candidate) => b.extractLength - a.extractLength;
const byYear = (a: PersonEntry, b: PersonEntry) => a.year - b.year;

function strip({ year, name, description, wikiTitle }: Candidate): PersonEntry {
  return { year, name, description, wikiTitle };
}

export interface BuildRegisterOptions {
  births: number;
  deaths: number;
}

/**
 * Build one date's register. Seven requests: the feed, the shortlist ranking
 * (page-props plus Wikidata), and the portrait/biography pass over the final
 * nine (thumbnails, licences, extracts).
 */
export async function fetchDayRegister(
  dateKey: string,
  { births: birthCount, deaths: deathCount }: BuildRegisterOptions,
): Promise<DayRegister> {
  const [month, day] = dateKey.split('-');
  const feed = await fetchJson<PeopleFeed>(`${FEED_BASE}/${month}/${day}`);

  const toShortlist = (entries: readonly FeedEntry[] = []) =>
    entries
      .map(toCandidate)
      .filter((c): c is Candidate => c !== null)
      .sort(byLengthDesc)
      .slice(0, SHORTLIST);

  const birthPool = toShortlist(feed.births);
  const deathPool = toShortlist(feed.deaths);

  // One ranking pass over both pools: the same person never appears in both, so
  // the combined list stays inside two batches.
  const counts = await sitelinkCounts([
    ...new Set([...birthPool, ...deathPool].map((c) => c.wikiTitle)),
  ]);

  const pick = (pool: Candidate[], take: number): PersonEntry[] =>
    pool
      .slice()
      .sort((a, b) => {
        const delta = (counts.get(b.wikiTitle) ?? 0) - (counts.get(a.wikiTitle) ?? 0);
        // Ties break on title so a rebuild reproduces the same register.
        return delta !== 0 ? delta : a.wikiTitle.localeCompare(b.wikiTitle);
      })
      .slice(0, take)
      .map(strip)
      .sort(byYear);

  // One enrichment pass over both lists: three requests for the whole day.
  const chosenBirths = pick(birthPool, birthCount);
  const chosenDeaths = pick(deathPool, deathCount);
  const enriched = await enrich([...chosenBirths, ...chosenDeaths]);

  return {
    dateKey,
    births: enriched.slice(0, chosenBirths.length),
    deaths: enriched.slice(chosenBirths.length),
    observances: observancesFrom(feed.holidays ?? []),
  };
}
