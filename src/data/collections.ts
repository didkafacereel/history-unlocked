import { COLLECTIONS, CollectionDef } from '@/config/collections';
import { HistoricalEvent } from '@/types/manifest';

import { loadAllEvents } from './ingestion';

/**
 * Resolving the Museum against the archive.
 *
 * One pass over every event assigns it to every set it belongs to, so the
 * whole board costs a single scan rather than one per collection. The result
 * is a snapshot, not live state: read-progress is layered on top by the
 * caller, which keeps this module free of any store dependency.
 */

export interface CollectionEntry {
  event: HistoricalEvent;
  read: boolean;
}

export interface ResolvedCollection {
  def: CollectionDef;
  /** Chronological. Every event in the archive that belongs to the set. */
  entries: CollectionEntry[];
  total: number;
  read: number;
}

export async function loadCollections(
  seen: Readonly<Record<string, number>>,
): Promise<ResolvedCollection[]> {
  const events = await loadAllEvents();

  const buckets = new Map<string, HistoricalEvent[]>(COLLECTIONS.map((c) => [c.id, []]));
  for (const event of events) {
    for (const def of COLLECTIONS) {
      if (def.matches(event)) {
        buckets.get(def.id)?.push(event);
      }
    }
  }

  return COLLECTIONS.map((def) => {
    const members = (buckets.get(def.id) ?? []).sort((a, b) => a.year - b.year);
    const entries = members.map((event) => ({ event, read: seen[event.id] !== undefined }));
    return {
      def,
      entries,
      total: entries.length,
      read: entries.filter((e) => e.read).length,
    };
    // Empty sets are a definition bug, not a user-facing state — hide them
    // rather than showing a reader a collection they can never start.
  }).filter((c) => c.total > 0);
}
