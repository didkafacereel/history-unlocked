/**
 * "On this day" source — Wikimedia's curated feed for any calendar date.
 *
 *   https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/MM/DD
 *
 * This is what makes real depth possible: a single date returns ~20 curated
 * highlights plus ~70 further events, each linked to Wikipedia pages that carry
 * a summary, a thumbnail, and often coordinates. Free, keyless, and covering all
 * 366 days — so the app can offer a dozen substantial events per date instead of
 * a token one-a-day.
 *
 * The feed supplies verified FACTS. It does not supply our voice: the page text
 * is CC BY-SA, so we treat it strictly as source material for the model to write
 * original copy from, never as text to copy through to the app.
 */

import { fetchJson } from './archival';

const FEED_BASE = 'https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all';

export interface EventCandidate {
  year: number;
  /** Wikimedia's one-line description of what happened. */
  summary: string;
  /** Primary linked article — the anchor for imagery and further detail. */
  wikiTitle: string;
  /** Lead-paragraph extract of that article. */
  extract: string;
  /** Wikidata one-liner for the page, e.g. "2012 earthquake in Afghanistan". */
  description?: string;
  hasImage: boolean;
  coordinates?: { lat: number; lon: number };
  /** Curated highlights rank above the long tail of raw events. */
  curated: boolean;
  /** Forced in from `cornerstones.ts` — never croppable, always the day's lead. */
  cornerstone?: boolean;
}

interface FeedPage {
  titles?: { normalized?: string };
  extract?: string;
  description?: string;
  thumbnail?: { source?: string };
  coordinates?: { lat?: number; lon?: number };
  type?: string;
}

interface FeedEntry {
  year?: number;
  text?: string;
  pages?: FeedPage[];
}

interface FeedResponse {
  selected?: FeedEntry[];
  events?: FeedEntry[];
}

function toCandidate(entry: FeedEntry, curated: boolean): EventCandidate | null {
  const page = entry.pages?.find((p) => p.titles?.normalized && p.type !== 'disambiguation');
  const wikiTitle = page?.titles?.normalized;
  if (!wikiTitle || entry.year === undefined || !entry.text) {
    return null;
  }

  const lat = page?.coordinates?.lat;
  const lon = page?.coordinates?.lon;

  return {
    year: entry.year,
    summary: entry.text,
    wikiTitle,
    // Long enough to carry the read-more sheet, not just the card's facts.
    extract: (page?.extract ?? '').slice(0, 2000),
    description: page?.description?.trim() || undefined,
    hasImage: Boolean(page?.thumbnail?.source),
    coordinates: lat !== undefined && lon !== undefined ? { lat, lon } : undefined,
    curated,
  };
}

/**
 * Fetch and rank the day's candidates.
 *
 * Ranking favors what makes a good card: a curated highlight with an image and
 * a real article behind it. Entries without imagery sink but are not dropped —
 * a strong event with no picture is still worth offering the model.
 *
 * Within a bucket the FEED'S OWN ORDER is kept (`sort` is stable), because it
 * is Wikimedia's editorial ranking and the only importance signal available for
 * free. It used to sort by year ascending, which meant taking the N oldest
 * entries and cutting every modern one: 11 September stopped at 1897, with the
 * 2001 attacks sitting unused at rank 17.
 */
export async function fetchDayCandidates(dateKey: string): Promise<EventCandidate[]> {
  const [month, day] = dateKey.split('-');
  // Shares the retry/backoff path — the feed throttles just like the APIs do.
  const feed = await fetchJson<FeedResponse>(`${FEED_BASE}/${month}/${day}`);
  const candidates = [
    ...(feed.selected ?? []).map((e) => toCandidate(e, true)),
    ...(feed.events ?? []).map((e) => toCandidate(e, false)),
  ].filter((c): c is EventCandidate => c !== null);

  // One card per article: the same event often appears in both sections.
  const byTitle = new Map<string, EventCandidate>();
  for (const candidate of candidates) {
    const existing = byTitle.get(candidate.wikiTitle);
    if (!existing || (!existing.curated && candidate.curated)) {
      byTitle.set(candidate.wikiTitle, candidate);
    }
  }

  return [...byTitle.values()].sort((a, b) => {
    if (a.curated !== b.curated) return a.curated ? -1 : 1;
    if (a.hasImage !== b.hasImage) return a.hasImage ? -1 : 1;
    return 0;
  });
}
