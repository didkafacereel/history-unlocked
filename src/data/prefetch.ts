import { Image } from 'expo-image';

import { HistoricalEvent } from '@/types/manifest';

/**
 * Warm the disk/memory cache for cards just outside the render window so a
 * fast fling never lands on an unloaded backdrop.
 */
export function prefetchAround(deck: readonly HistoricalEvent[], activeIndex: number): void {
  for (const offset of [2, 3]) {
    const event = deck[activeIndex + offset];
    if (event) {
      // Fire-and-forget; expo-image dedupes in-flight requests.
      Image.prefetch(event.imageUrl);
    }
  }
}
