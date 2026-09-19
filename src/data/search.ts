import { HistoricalEvent } from '@/types/manifest';

import { loadAllEvents } from './ingestion';

/**
 * Search over the whole archive.
 *
 * Built in memory, once, on first use: the manifest is already resolved and
 * held for the feed, so an index is a lowercase string per event and nothing
 * more. No library, no server, no network — at eight thousand events a linear
 * scan of pre-lowercased text finishes well inside a frame, and the alternative
 * (a trie, a hosted index) buys nothing a reader could perceive.
 *
 * Matching is AND across whitespace-separated terms, so "roman fire" finds the
 * event about both rather than everything about either — with short queries
 * that difference is the whole experience.
 */

interface IndexedEvent {
  event: HistoricalEvent;
  haystack: string;
}

let index: IndexedEvent[] | null = null;
let building: Promise<IndexedEvent[]> | null = null;

async function ensureIndex(): Promise<IndexedEvent[]> {
  if (index) {
    return index;
  }
  // Concurrent callers (a fast typist) share one build rather than racing.
  building ??= loadAllEvents().then((events) => {
    index = events.map((event) => ({
      event,
      haystack:
        `${event.title} ${event.region} ${event.summary ?? ''} ${event.category ?? ''} ${event.year}`.toLowerCase(),
    }));
    building = null;
    return index;
  });
  return building;
}

export interface SearchHit {
  event: HistoricalEvent;
  /** Higher is a better match — title hits beat body hits. */
  score: number;
}

const MIN_QUERY = 2;

function scoreOf(entry: IndexedEvent, terms: readonly string[]): number {
  const title = entry.event.title.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (!entry.haystack.includes(term)) {
      return 0;
    }
    // A term in the headline is worth far more than one buried in the article.
    score += title.includes(term) ? 10 : 1;
  }
  // Nudge cornerstones and richer events up among otherwise equal matches.
  return score + (entry.event.cornerstone ? 5 : 0) + Math.min(entry.event.facts.length, 4) * 0.1;
}

export async function searchArchive(query: string, limit = 40): Promise<SearchHit[]> {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0 || query.trim().length < MIN_QUERY) {
    return [];
  }

  const entries = await ensureIndex();
  const hits: SearchHit[] = [];
  for (const entry of entries) {
    const score = scoreOf(entry, terms);
    if (score > 0) {
      hits.push({ event: entry.event, score });
    }
  }

  hits.sort((a, b) => b.score - a.score || a.event.year - b.event.year);
  return hits.slice(0, limit);
}

/** Drop the index so a refreshed manifest is picked up. */
export function resetSearchIndex(): void {
  index = null;
  building = null;
}
