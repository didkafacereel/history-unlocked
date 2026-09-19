/**
 * Replace national-symbol backdrops with pictures of the actual event.
 *
 *   npx tsx pipeline/refresh-symbol-images.ts [--dry] [--limit N]
 *
 * The defect, measured: 576 of 8056 events show a flag, a coat of arms or a
 * locator map. The cause is not a bug in the imagery pass — it is that
 * Wikimedia's "on this day" feed links many entries to the COUNTRY rather than
 * to the event ("India", "North Korea", "United States"), and a country article
 * leads with its flag. So the archive ends up illustrating Indian independence
 * with the Indian flag, which tells the reader nothing they did not know from
 * the headline.
 *
 * The fix is to stop asking the hub article. Each event's own sentence is a
 * good search query — "India establishes its highest civilian awards, the
 * Bharat Ratna" finds the article about the award, which has a picture of the
 * award. Candidates are tried in order and the FIRST one yielding a
 * freely-licensed, non-symbol image wins.
 *
 * Four guards, because a search that lands on the wrong article is a worse
 * failure than the flag it replaced — the flag is merely uninformative, a
 * picture of the wrong atrocity is a lie:
 *
 *  1. Events where the symbol IS the subject are skipped entirely — the flag on
 *     "the Italian tricolour was first adopted" is the correct picture.
 *  2. A replacement that is itself a symbol is rejected, so a country hub
 *     cannot be swapped for another country hub.
 *  3. The event's own `wikiTitle` is never re-tried; it is what produced the
 *     bad image.
 *  4. `articleMatchesEvent` requires every significant word of the candidate's
 *     title to appear in the event's own words. Added after a first dry run
 *     sent the World Trade Organization to the 1993 World Trade Center bombing
 *     and a British police investigation to a Colombian serial killer.
 *
 * TWO STEPS, and the split is the point. `--propose` searches and writes every
 * suggestion to `pipeline/drafts/symbol-proposals.json` WITHOUT touching the
 * database; `--apply` writes the proposals that are still in that file. In
 * between, a human reads the list and deletes the bad ones.
 *
 * Automated in one step it would be irresponsible. Tuned as far as it is worth
 * tuning, roughly one suggestion in four is still wrong in a way no rule
 * catches — an article that is genuinely about the event but illustrated with a
 * modern tourist photograph, or a generic concept article whose picture is from
 * the wrong century. Those are visible to a person reading a list of
 * before→after filenames in seconds, and invisible to a regular expression.
 *
 * The proposal file is written incrementally: this makes thousands of API calls
 * over an hour or more and WILL be interrupted.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { manifestSchema } from '../src/data/manifest/schema';
import type { HistoricalEvent } from '../src/types/manifest';
import {
  ArchivalImage,
  commonsKey,
  fetchArticleImageNames,
  resolveArchivalImage,
  resolveCommonsFiles,
  searchArticleTitles,
  searchCommonsFiles,
} from './archival';
import {
  articleIsAPlace,
  articleMatchesEvent,
  isHubArticle,
  isAnachronistic,
  isPlaceHub,
  isSymbolImage,
  replacementFault,
  symbolIsTheSubject,
} from './image-overrides';
import { imageWasRejected, wasRejected } from './image-rejections';

const DB_PATH = path.resolve('pipeline/events-db.json');
const PROPOSALS_PATH = path.resolve('pipeline/drafts/symbol-proposals.json');
/** The last published archive — the only record of what a backdrop used to be. */
const PUBLISHED_PATH = path.resolve('docs/manifest.json');
/** Every event this pass has examined, so a restart does not redo the misses. */
const TRIED_PATH = path.resolve('pipeline/drafts/symbol-tried.json');
const THUMB_WIDTH = 1200;
/** Search hits to try per event before giving up and keeping the symbol. */
const CANDIDATES = 4;
/** Save this often, so an interrupted run keeps its work. */
const SAVE_EVERY = 20;
/**
 * Pause between events. Without it the first dry run spent more time serving
 * 429 penalties (45-57s each) than making requests — Wikimedia would rather be
 * asked politely than backed off after the fact.
 */
const PACE_MS = 700;
/**
 * Where an undated work ranks among dated ones. Above the era window (25), so
 * any picture Commons actually dates near the event beats it.
 */
const UNDATED_SCORE = 40;
/** Commons file-search results to consider per event. */
const COMMONS_SEARCH_LIMIT = 30;
/**
 * How close a Commons hit must be to count as contemporary.
 *
 * Tighter than the 25-year era window, because this pool is noisier: the
 * window decides whether a candidate is TOLERABLE, this decides whether it is
 * worth overruling the article on.
 */
const COMMONS_MAX_GAP = 8;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function readArg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  const v = i >= 0 ? process.argv[i + 1] : undefined;
  return v && !v.startsWith('--') ? v : null;
}

function readDb(): HistoricalEvent[] {
  return manifestSchema.parse(JSON.parse(readFileSync(DB_PATH, 'utf8'))).events;
}

/** How many events currently use each backdrop. */
function usageCounts(events: readonly HistoricalEvent[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    counts.set(event.imageUrl, (counts.get(event.imageUrl) ?? 0) + 1);
  }
  return counts;
}

function save(events: HistoricalEvent[]): void {
  const merged = manifestSchema.parse({
    version: 1,
    generatedAt: new Date().toISOString(),
    events: events.slice().sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.year - b.year),
  });
  writeFileSync(DB_PATH, `${JSON.stringify(merged, null, 2)}\n`);
}

/**
 * A search query from the event itself.
 *
 * The title is the feed's own sentence about what happened, which is exactly
 * what a search engine needs. The year is appended because many of these are
 * recurring subjects — "general strike in Guinea" wants the 2007 one.
 */
function queryFor(event: HistoricalEvent): string {
  const year = event.year < 0 ? `${Math.abs(event.year)} BC` : String(event.year);
  return `${event.title.slice(0, 120)} ${year}`;
}

/**
 * Articles that stand for a subject rather than a moment, read off the archive
 * itself instead of guessed at by pattern.
 *
 * The signal is free and exact: if several events across a wide stretch of
 * years all cite one article, that article is a topic. "World War II" carries
 * 116 events, "The Troubles" 30 across 38 years. No regex would have caught
 * those — `isHubArticle` only knows the "History of X" shape — and a list
 * written by hand would go stale the moment the archive grew.
 */
function topicArticles(events: readonly HistoricalEvent[]): ReadonlySet<string> {
  const years = new Map<string, number[]>();
  for (const event of events) {
    if (!event.wikiTitle) {
      continue;
    }
    const list = years.get(event.wikiTitle) ?? [];
    list.push(event.year);
    years.set(event.wikiTitle, list);
  }
  const topics = new Set<string>();
  for (const [title, list] of years) {
    if (list.length >= 3 && Math.max(...list) - Math.min(...list) > 5) {
      topics.add(title);
    }
  }
  return topics;
}

/**
 * A usable picture further down the event's OWN article.
 *
 * Tried before any search, and it is the better move whenever it works: the
 * article is already the correct subject, and only Wikipedia's choice of lead
 * image was wrong. Searching for a different article risks landing on the wrong
 * subject entirely; looking at the second picture on the right page cannot.
 *
 * That last sentence is true only of an article about ONE MOMENT, and taking it
 * for granted is how this pass did its worst damage. "World War II" is the
 * correct article for a hundred events, and its other forty pictures are other
 * battles; handing one to each event put the Auschwitz mugshot of Czesława
 * Kwoka over Operation Iskra and the League of Nations chamber over Hitler
 * entering the Führerbunker. See `topicArticles` for how those pages are
 * recognised and restore-topic-backdrops.ts for the repair.
 */
async function alternativeFromOwnArticle(
  event: HistoricalEvent,
  rejections: string[],
  overused: (url: string) => boolean,
  /** Articles that span years, whose other images are other events. */
  topics: ReadonlySet<string>,
): Promise<{ title: string; image: ArchivalImage } | null> {
  const title = event.wikiTitle;
  if (!title) {
    return null;
  }
  // Only for articles that are ABOUT something specific. A country page's other
  // images are a tourist gallery — see articleIsAPlace for what that produced.
  if (articleIsAPlace(event.region)) {
    return null;
  }
  if (topics.has(title) || isHubArticle(title)) {
    rejections.push(`${title} — a subject spanning years; its other pictures are other events`);
    return null;
  }
  let names: string[];
  try {
    names = await fetchArticleImageNames(title);
  } catch {
    return null;
  }

  // One request for the whole page's images, not one per image. See
  // resolveCommonsFiles — doing it the other way ran at two events a minute.
  const usable = names.filter((n) => !isSymbolImage(n));
  let resolved: Map<string, ArchivalImage>;
  try {
    resolved = await resolveCommonsFiles(usable, THUMB_WIDTH);
  } catch {
    return null;
  }

  /**
   * The CLOSEST picture in time, not the first usable one.
   *
   * First-match is what the pass did originally, and on a long-lived subject
   * it reliably picks another modern photograph: an undated 2014 shot of the
   * USS Pueblo in a Pyongyang museum survives every rule and wins simply
   * because it appears earlier on the page than the 1968 one. Commons already
   * tells us when each work is dated — `resolveCommonsFiles` carries it — so
   * ranking by distance from the event costs nothing and is the whole point
   * when the defect being repaired is an anachronism.
   */
  let best: { image: ArchivalImage; score: number } | null = null;
  for (const name of usable) {
    const image = resolved.get(commonsKey(name));
    if (!image) {
      continue;
    }
    const fault = imageWasRejected(image.imageUrl)
      ? 'refused on review'
      : overused(image.imageUrl)
        ? 'already the backdrop of other events'
        : replacementFault(image.imageUrl, event.year, image.dateYear);
    if (fault) {
      rejections.push(`${name} — ${fault}`);
      continue;
    }
    // Anything still dated is within the era window, so its gap is a real
    // score. An undated work ranks behind every dated one that survived, and
    // ahead of keeping the anachronism.
    const score = image.dateYear === undefined ? UNDATED_SCORE : Math.abs(image.dateYear - event.year);
    if (!best || score < best.score) {
      best = { image, score };
    }
  }
  // The article is unchanged, so `wikiTitle` stays as it was.
  return best ? { title, image: best.image } : null;
}

/**
 * Commons itself, when the article's own pictures are all the wrong decade.
 *
 * The article holds whatever an editor put there, which for a long-lived
 * subject is usually the current photograph — the very material that made
 * these events anachronistic. Commons holds the rest, and dates most of it.
 *
 * Only for repairing an ANACHRONISM, and only when a dated result actually
 * lands near the event. A file search is much noisier than an article's own
 * gallery, so it is not allowed to answer the looser question "is there any
 * other picture": it may only answer "is there one from the right time".
 */
async function contemporaryFromCommons(
  event: HistoricalEvent,
  rejections: string[],
  overused: (url: string) => boolean,
): Promise<{ title: string; image: ArchivalImage } | null> {
  const title = event.wikiTitle;
  if (!title || !isAnachronistic(event.imageUrl, event.year)) {
    return null;
  }

  let names: string[];
  try {
    names = await searchCommonsFiles(`${title} ${event.year}`, COMMONS_SEARCH_LIMIT);
  } catch {
    return null;
  }
  const usable = names.filter((n) => !isSymbolImage(n));
  if (usable.length === 0) {
    return null;
  }

  let resolved: Map<string, ArchivalImage>;
  try {
    resolved = await resolveCommonsFiles(usable, THUMB_WIDTH);
  } catch {
    return null;
  }

  let best: { image: ArchivalImage; gap: number } | null = null;
  for (const name of usable) {
    const image = resolved.get(commonsKey(name));
    // A search hit with no date is not evidence of anything: the whole reason
    // to come here is that the event needs something provably contemporary.
    if (!image || image.dateYear === undefined) {
      continue;
    }
    const fault = imageWasRejected(image.imageUrl)
      ? 'refused on review'
      : overused(image.imageUrl)
        ? 'already the backdrop of other events'
        : replacementFault(image.imageUrl, event.year, image.dateYear);
    if (fault) {
      rejections.push(`${name} — ${fault}`);
      continue;
    }
    const gap = Math.abs(image.dateYear - event.year);
    if (gap <= COMMONS_MAX_GAP && (!best || gap < best.gap)) {
      best = { image, gap };
    }
  }
  return best ? { title, image: best.image } : null;
}

async function betterImageFor(
  event: HistoricalEvent,
  rejections: string[],
  /** Backdrops already in heavy use — swapping into one of those fixes nothing. */
  usage: Map<string, number>,
  topics: ReadonlySet<string>,
): Promise<{ title: string; image: NonNullable<Awaited<ReturnType<typeof resolveArchivalImage>>> } | null> {
  // >= 1, not >= 2. Anything already on a card is taken, and the count is
  // bumped the moment a proposal is made — at >= 2 a single run handed the same
  // Hong Kong photograph to two different WWII events, manufacturing exactly
  // the duplication this pass exists to remove.
  const overused = (url: string) => (usage.get(url) ?? 0) >= 1;

  const fromOwn = await alternativeFromOwnArticle(event, rejections, overused, topics);
  if (fromOwn) {
    return fromOwn;
  }

  // Third, and only for anachronisms: Commons holds far more of a subject than
  // its article shows, and dates most of it.
  const fromCommons = await contemporaryFromCommons(event, rejections, overused);
  if (fromCommons) {
    return fromCommons;
  }

  let titles: string[];
  try {
    titles = await searchArticleTitles(queryFor(event), CANDIDATES);
  } catch {
    return null;
  }

  for (const title of titles) {
    if (title === event.wikiTitle) {
      continue; // This is the article that produced the symbol.
    }
    // Guard 4, and the one that does the real work: a search hit is only
    // usable if the event's own words vouch for it. See articleMatchesEvent.
    if (!articleMatchesEvent(title, event.title, event.summary, event.year)) {
      continue;
    }
    if (isPlaceHub(title, event.region)) {
      rejections.push(`${title} — the place, not the event`);
      continue;
    }
    // Never propose something a reviewer has already turned down: without this
    // every run hands back the same decisions to be made again.
    if (isHubArticle(title) || wasRejected(event.year, title)) {
      rejections.push(`${title} — refused before`);
      continue;
    }
    let image;
    try {
      image = await resolveArchivalImage({ wikiTitle: title, fallbackQuery: title, width: THUMB_WIDTH });
    } catch {
      continue;
    }
    if (!image) {
      continue;
    }
    const fault = imageWasRejected(image.imageUrl)
      ? 'refused on review'
      : overused(image.imageUrl)
        ? 'already the backdrop of other events'
        : replacementFault(image.imageUrl, event.year, image.dateYear);
    if (fault) {
      rejections.push(`${title} — ${fault}`);
      continue;
    }
    return { title, image };
  }
  return null;
}

/** One suggested swap, written for a person to read before anything changes. */
interface Proposal {
  eventId: string;
  year: number;
  eventTitle: string;
  /** The article the new picture comes from — the most useful thing to audit. */
  article: string;
  from: string;
  to: string;
  imageUrl: string;
  credit?: string;
  sourceUrl?: string;
  aspect?: number;
}

/** Event ids this pass has already examined, whatever the outcome. */
function readTried(): Set<string> {
  if (!existsSync(TRIED_PATH)) {
    return new Set();
  }
  try {
    return new Set(JSON.parse(readFileSync(TRIED_PATH, 'utf8')) as string[]);
  } catch {
    return new Set();
  }
}

/** Proposals already on disk, or none. Never fails — a resume must not block. */
function readProposalsIfAny(): Proposal[] {
  if (!existsSync(PROPOSALS_PATH)) {
    return [];
  }
  try {
    return JSON.parse(readFileSync(PROPOSALS_PATH, 'utf8')) as Proposal[];
  } catch {
    return [];
  }
}

function readProposals(): Proposal[] {
  if (!existsSync(PROPOSALS_PATH)) {
    console.error(`No proposals at ${PROPOSALS_PATH}. Run with --propose first.`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(PROPOSALS_PATH, 'utf8')) as Proposal[];
}

/**
 * Write the proposals that survived review into the database.
 *
 * Deleting an entry from the JSON file is how a reviewer rejects it, which is
 * the whole interface: no flags to remember, no second list to keep in sync.
 */
function apply(): void {
  const proposals = readProposals();
  const events = readDb();
  const byId = new Map(events.map((e) => [e.id, e]));
  let applied = 0;
  let rejected = 0;

  for (const p of proposals) {
    const event = byId.get(p.eventId);
    if (!event) {
      console.warn(`  ~ ${p.eventId} is no longer in the database — skipped`);
      continue;
    }
    // Re-checked here, not only when proposed: the rules get tighter as bad
    // suggestions are found, and a proposal file written under the old rules
    // must not smuggle one past the new ones.
    const fault = wasRejected(p.year, p.article)
      ? 'refused on review before'
      : imageWasRejected(p.imageUrl)
        ? 'this picture was refused on review'
        : isHubArticle(p.article)
          ? 'a subject index, not the event'
          : replacementFault(p.imageUrl, p.year);
    if (fault) {
      console.log(`  ~ ${p.year} ${p.article} — ${fault}`);
      rejected++;
      continue;
    }
    // The credits move with the url. They are the licence terms, and keeping
    // the previous attribution over a new picture is a licence breach.
    event.imageUrl = p.imageUrl;
    event.imageCredit = p.credit;
    event.imageSourceUrl = p.sourceUrl;
    event.imageAspect = p.aspect;
    // The article is now the one the picture came from, so a later archival
    // pass re-resolves the SAME image instead of restoring the symbol.
    event.wikiTitle = p.article;
    applied++;
  }

  save(events);
  const remaining = events.filter((e) => isSymbolImage(e.imageUrl)).length;
  console.log(
    `\n${applied} applied, ${rejected} refused by the current rules. ${remaining} symbol backdrops remain.`,
  );
  console.log('Next: npm run pipeline:publish && npm run pipeline:fixture');
}

async function propose(): Promise<void> {
  const limit = Number(readArg('--limit') ?? '0');

  const events = readDb();
  const usage = usageCounts(events);

  /**
   * A backdrop is bad if it is a symbol, or if so many events share it that the
   * reader sees the same picture over and over.
   *
   * The second is the larger defect by far and has the same cause: the feed
   * links many entries to one hub article, so "World War II" handed the same
   * Junkers photograph to 168 different events. A reader scrolling the archive
   * meets it every few days. Five is the threshold because four repeats across
   * eight thousand cards is invisible and six is not.
   */
  const shared = Number(readArg('--shared') ?? '5');
  /**
   * Third kind of bad backdrop, added after measuring the published archive:
   * a picture of the subject decades LATER. 184 modern events were shipping
   * one, because the era gate had only ever been applied to replacement
   * candidates and never to the lead image the archival pass took.
   */
  const isBad = (e: HistoricalEvent) =>
    isSymbolImage(e.imageUrl) ||
    isAnachronistic(e.imageUrl, e.year) ||
    (usage.get(e.imageUrl) ?? 0) >= shared;

  /**
   * Resume rather than restart.
   *
   * This pass runs for hours and has now been cut short twice — once by a
   * malformed filename, once by the process simply going away. Starting over
   * each time means the first two hundred events are re-crawled on every
   * attempt and the run never reaches the end. So proposals already on disk are
   * kept and their events skipped; `--fresh` throws them away deliberately.
   */
  const fresh = process.argv.includes('--fresh');
  const carried = fresh ? [] : readProposalsIfAny();
  // Two thirds of events yield nothing, and that search cost is the bulk of the
  // run — so the log of what has been TRIED matters more than the proposals for
  // resuming. Without it a restart re-crawls hundreds of dead ends.
  const tried = fresh ? new Set<string>() : readTried();
  for (const p of carried) {
    tried.add(p.eventId);
  }
  if (tried.size > 0) {
    console.log(`Resuming: ${tried.size} events already examined, ${carried.length} proposed.`);
  }

  let targets = events.filter(
    (e) => isBad(e) && !symbolIsTheSubject(e.title, e.summary) && !tried.has(e.id),
  );
  const protectedCount = events.filter(
    (e) => isBad(e) && symbolIsTheSubject(e.title, e.summary),
  ).length;

  if (limit > 0) {
    targets = targets.slice(0, limit);
  }

  const topics = topicArticles(events);
  console.log(
    `${targets.length} events to re-image · ${protectedCount} left alone because the symbol is the subject · ${topics.size} topic articles off limits\n`,
  );

  // Before the loop, not after it: the incremental save every SAVE_EVERY
  // proposals would otherwise throw on a clean checkout with no drafts folder.
  mkdirSync(path.dirname(PROPOSALS_PATH), { recursive: true });

  const proposals: Proposal[] = [...carried];
  // Carried proposals have already claimed their pictures; without this a
  // resumed run would hand the same image to a second event.
  for (const p of carried) {
    usage.set(p.imageUrl, (usage.get(p.imageUrl) ?? 0) + 1);
  }
  let kept = 0;

  const saveProgress = () => {
    writeFileSync(PROPOSALS_PATH, `${JSON.stringify(proposals, null, 1)}\n`);
    writeFileSync(TRIED_PATH, `${JSON.stringify([...tried], null, 0)}\n`);
  };

  for (const [i, event] of targets.entries()) {
    await sleep(PACE_MS);
    // Marked before the work, not after: an event that crashes the process mid
    // examination must not be retried forever on every resume.
    tried.add(event.id);
    const rejections: string[] = [];
    // Per-event, because this loop runs for hours over data from the internet
    // and one unexpected value must not cost the whole run. A malformed
    // percent-escape in a Commons filename already threw out of a `.filter()`
    // and ended a pass at event twenty-four of sixteen hundred.
    let found: Awaited<ReturnType<typeof betterImageFor>>;
    try {
      found = await betterImageFor(event, rejections, usage, topics);
    } catch (error) {
      kept++;
      console.log(`  ! ${event.year} ${event.title.slice(0, 46)}  (${String(error).slice(0, 60)})`);
      continue;
    }
    if (!found) {
      kept++;
      const why = rejections.length > 0 ? `rejected ${rejections[0]}` : 'no candidate matched';
      console.log(`  – ${event.year} ${event.title.slice(0, 46)}  (${why})`);
      // The misses are most of the run; checkpoint them or a restart redoes them.
      if (i % 25 === 24) {
        saveProgress();
      }
      continue;
    }

    proposals.push({
      eventId: event.id,
      year: event.year,
      eventTitle: event.title,
      article: found.title,
      from: decodeURIComponent(event.imageUrl.split('/').pop() ?? ''),
      to: decodeURIComponent(found.image.imageUrl.split('/').pop() ?? ''),
      imageUrl: found.image.imageUrl,
      credit: found.image.credit,
      sourceUrl: found.image.sourceUrl,
      aspect: found.image.aspect,
    });
    // Count it immediately: two events proposed the same picture in one run
    // otherwise, which is the defect this pass exists to remove.
    usage.set(found.image.imageUrl, (usage.get(found.image.imageUrl) ?? 0) + 1);

    console.log(`  ✓ ${event.year} ${event.title.slice(0, 46)}`);
    console.log(`      → ${found.title}  ·  ${proposals[proposals.length - 1]?.to.slice(0, 52)}`);

    if (proposals.length % SAVE_EVERY === 0) {
      saveProgress();
      console.log(`      … ${proposals.length} proposals saved (${i + 1}/${targets.length})`);
    }
  }

  saveProgress();
  console.log(
    `\n${proposals.length} proposed, ${kept} left alone (no better picture exists).\nWritten to ${PROPOSALS_PATH} — read it, delete the bad ones, then run --apply.`,
  );
}

/**
 * Undo an apply, using the last published manifest as the record of what the
 * pictures were before it.
 *
 * `--apply` overwrites `imageUrl` and `wikiTitle` in place, so a swap that
 * turns out to be wrong cannot be undone from the database alone — the thing it
 * replaced is gone. `docs/manifest.json` is only rewritten by `pipeline:publish`
 * and so still holds the previous state, which makes it the undo log. Revert,
 * widen the rejection list, apply again: that is the loop, and reverting
 * everything each time keeps it idempotent.
 */
function revert(): void {
  const published = manifestSchema.parse(JSON.parse(readFileSync(PUBLISHED_PATH, 'utf8')));
  const before = new Map(published.events.map((e) => [e.id, e]));
  const events = readDb();
  let restored = 0;

  for (const p of readProposals()) {
    const event = byIdOf(events).get(p.eventId);
    const original = before.get(p.eventId);
    if (!event || !original || event.imageUrl === original.imageUrl) {
      continue;
    }
    event.imageUrl = original.imageUrl;
    event.imageCredit = original.imageCredit;
    event.imageSourceUrl = original.imageSourceUrl;
    event.imageAspect = original.imageAspect;
    event.wikiTitle = original.wikiTitle;
    restored++;
  }

  save(events);
  console.log(`${restored} backdrops restored from the last published manifest.`);
}

let idIndex: Map<string, HistoricalEvent> | null = null;
function byIdOf(events: HistoricalEvent[]): Map<string, HistoricalEvent> {
  idIndex ??= new Map(events.map((e) => [e.id, e]));
  return idIndex;
}

async function main(): Promise<void> {
  if (process.argv.includes('--revert')) {
    revert();
    return;
  }
  if (process.argv.includes('--apply')) {
    apply();
    return;
  }
  await propose();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
