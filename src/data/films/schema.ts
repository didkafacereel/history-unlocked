import { z } from 'zod';

/**
 * `films.json` — the index of the day's films, one per calendar date.
 *
 * Published beside the videos (Cloudflare R2) by `video/tools/publish-films.mjs`
 * every night, never inside the manifest: the manifest is 22 MB and is not
 * republished nightly, while this file changes every day and is a few KB.
 *
 * Keyed by "MM-DD" like the rest of the app. A date filmed in two different
 * years keeps the newer film — the index says which day it was made on.
 */
export const dayFilmSchema = z.object({
  /** "YYYY-MM-DD" the film was made for. */
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** The archive event the film tells, when it is one. */
  eventId: z.string().nullable(),
  title: z.string().min(1),
  seconds: z.number().positive(),
  /** Path of the mp4, relative to the index (may carry a `?v=` cache key). */
  video: z.string().min(1),
  /** Path of the poster frame, relative to the index. */
  poster: z.string().min(1),
});

export const filmsFileSchema = z.object({
  version: z.literal(1),
  films: z.record(z.string().regex(/^\d{2}-\d{2}$/), dayFilmSchema),
});

export type DayFilmEntry = z.infer<typeof dayFilmSchema>;
export type FilmsFile = z.infer<typeof filmsFileSchema>;
