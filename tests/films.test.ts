import { describe, expect, it } from 'vitest';

import { formatFilmLength, resolveFilms } from '@/data/films';
import { filmsFileSchema } from '@/data/films/schema';

/**
 * The films index is published nightly by video/tools/publish-films.mjs and
 * read by the app. These pin the shape both sides agree on.
 */
const file = {
  version: 1,
  films: {
    '09-28': {
      date: '2026-09-28',
      eventId: 'evt-09-28-1928-alexander-fleming',
      title: 'Fleming confirms penicillin',
      seconds: 54.2,
      video: '2026-09-28-fleming.mp4?v=2021000',
      poster: '2026-09-28-fleming.jpg?v=2021000',
    },
  },
};

describe('films index', () => {
  it('accepts what the publisher writes', () => {
    expect(filmsFileSchema.safeParse(file).success).toBe(true);
  });

  it('rejects a date key that is not MM-DD', () => {
    const bad = { ...file, films: { '2026-09-28': file.films['09-28'] } };
    expect(filmsFileSchema.safeParse(bad).success).toBe(false);
  });

  it('resolves paths against the bucket, keeping the cache key', () => {
    const films = resolveFilms(filmsFileSchema.parse(file), 'https://films.example');
    expect(films['09-28']?.videoUrl).toBe('https://films.example/2026-09-28-fleming.mp4?v=2021000');
    expect(films['09-28']?.posterUrl).toBe('https://films.example/2026-09-28-fleming.jpg?v=2021000');
  });

  it('shows the length as m:ss', () => {
    expect(formatFilmLength(54.2)).toBe('0:54');
    expect(formatFilmLength(61.6)).toBe('1:02');
  });
});
