import { z } from 'zod';

import { historicalEventSchema } from '../src/data/manifest/schema';

export type DbEvent = z.infer<typeof historicalEventSchema>;

/**
 * Turns a manifest event into a text-to-image prompt. One consistent visual
 * language across the whole app: painterly, cinematic, vertical, no text —
 * the card UI supplies all typography.
 */

const ERA_FLAVOR: Record<DbEvent['era'], string> = {
  Ancient: 'bronze weapons, stone temples, torchlight, antiquity',
  Classical: 'marble columns, legions, Mediterranean light',
  Medieval: 'banners, castles, candlelit halls, mist',
  'Early Modern': 'sailing ships, powder smoke, oil-painting palette, court intrigue',
  Industrial: 'steam, iron, gaslight, soot-stained skies',
  Modern: 'documentary realism, period photography mood, film grain',
};

export function buildImagePrompt(event: DbEvent): string {
  return [
    `Epic cinematic historical illustration of: ${event.title}.`,
    `Setting: ${event.region}, year ${Math.abs(event.year)}${event.year < 0 ? ' BCE' : ''}.`,
    `Atmosphere: ${ERA_FLAVOR[event.era]}.`,
    'Dramatic volumetric lighting, painterly concept-art style, rich color grading,',
    'vertical 9:16 composition with quiet lower third for overlaid text,',
    'no text, no letters, no watermark, no modern objects, no borders.',
  ].join(' ');
}

/** FNV-1a hash of the event id → stable per-event seed, deterministic re-runs. */
export function seedFor(eventId: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < eventId.length; i++) {
    hash ^= eventId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
