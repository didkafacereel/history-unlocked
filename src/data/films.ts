import { filmsFileSchema, type FilmsFile } from './films/schema';

/**
 * The day's film — the nightly short, inside the app (update 1.1).
 *
 * Every night the video pipeline makes a ~1-minute film about one event of the
 * next date, cut before its social-media end card, and publishes it with an
 * index (`films.json`) to Cloudflare R2. This module reads that index.
 *
 * An enrichment, never the content: with `EXPO_PUBLIC_FILMS_URL` unset, the
 * index unreachable or malformed, the app simply shows no film button. Nothing
 * here may block the feed.
 */

/** Base URL of the public bucket, e.g. "https://pub-….r2.dev". */
export const FILMS_BASE_URL: string | null =
  process.env.EXPO_PUBLIC_FILMS_URL?.trim().replace(/\/+$/, '') || null;

const FETCH_TIMEOUT_MS = 8_000;

/** What a screen needs to show and play one film. */
export interface DayFilm {
  dateKey: string;
  title: string;
  seconds: number;
  eventId: string | null;
  videoUrl: string;
  posterUrl: string;
}

/** Resolve a validated index against its base URL. Pure, for the tests. */
export function resolveFilms(file: FilmsFile, base: string): Record<string, DayFilm> {
  const out: Record<string, DayFilm> = {};
  for (const [dateKey, f] of Object.entries(file.films)) {
    out[dateKey] = {
      dateKey,
      title: f.title,
      seconds: f.seconds,
      eventId: f.eventId,
      videoUrl: `${base}/${f.video.replace(/^\/+/, '')}`,
      posterUrl: `${base}/${f.poster.replace(/^\/+/, '')}`,
    };
  }
  return out;
}

/** "0:52" — the length shown on the button. */
export function formatFilmLength(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Fetch and validate the index. Resolves to an empty map on any failure:
 * the caller cannot tell "no films" from "films unreachable", and should not
 * need to.
 */
export async function fetchFilms(): Promise<Record<string, DayFilm>> {
  const base = FILMS_BASE_URL;
  if (!base) {
    return {};
  }
  // AbortController + setTimeout, never `AbortSignal.timeout`: React Native's
  // AbortSignal has no static `timeout` (see ingestion.ts).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let json: unknown;
  try {
    const res = await fetch(`${base}/films.json`, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[films] HTTP ${res.status}; no films`);
      return {};
    }
    json = await res.json();
  } catch (e) {
    console.warn(`[films] unreachable (${String(e)}); no films`);
    return {};
  } finally {
    clearTimeout(timer);
  }
  const parsed = filmsFileSchema.safeParse(json);
  if (!parsed.success) {
    console.warn('[films] index failed validation; no films');
    return {};
  }
  return resolveFilms(parsed.data, base);
}
