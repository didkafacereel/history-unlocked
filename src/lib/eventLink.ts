import * as Linking from 'expo-linking';

/**
 * The shareable address of a single event.
 *
 * A share card with no way back is a dead end: someone sees the image, has no
 * idea what produced it, and the loop ends there. Every share therefore carries
 * a link to the event's own page.
 *
 * Two shapes, and which one you get depends on whether the archive is hosted
 * yet. With `EXPO_PUBLIC_WEB_ORIGIN` set, the link is a normal https URL that
 * opens in any browser AND deep-links into the app on a device that has it.
 * Without it, `Linking.createURL` falls back to the `historyunlocked://` scheme
 * — which works app-to-app and in development, but is useless to a stranger.
 * So the card only PRINTS the link when there is a real web origin to print.
 */

const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_ORIGIN?.trim().replace(/\/+$/, '') || null;

export function eventUrl(eventId: string): string {
  return WEB_ORIGIN ? `${WEB_ORIGIN}/e/${eventId}` : Linking.createURL(`/e/${eventId}`);
}

/** The link without its scheme, for printing on a share card. Null if private. */
export function eventUrlLabel(eventId: string): string | null {
  if (!WEB_ORIGIN) {
    return null;
  }
  return `${WEB_ORIGIN.replace(/^https?:\/\//, '')}/e/${eventId}`;
}

/** Message text accompanying a shared card. */
export function shareMessage(title: string, year: number, eventId: string): string {
  const when = year < 0 ? `${Math.abs(year)} BCE` : String(year);
  return `${when} — ${title}\n\n${eventUrl(eventId)}`;
}
