import { describe, expect, it } from 'vitest';

import { CORNERSTONE_HEADLINES, headlineKey } from '../pipeline/cornerstone-headlines';
import { CORNERSTONES } from '../pipeline/cornerstones';

/**
 * The lead card's headline is the first thing a reader sees on a date. Every
 * cornerstone has a written one, and none can be cut by the card.
 */
describe('cornerstone headlines', () => {
  it('covers every cornerstone, and nothing that is not one', () => {
    const keys = new Set(CORNERSTONES.map((c) => headlineKey(c.dateKey, c.year)));
    expect([...keys].filter((k) => !CORNERSTONE_HEADLINES[k])).toEqual([]);
    expect(Object.keys(CORNERSTONE_HEADLINES).filter((k) => !keys.has(k))).toEqual([]);
  });

  it('keeps every headline within the 90 characters the card shows whole', () => {
    const tooLong = Object.entries(CORNERSTONE_HEADLINES)
      .filter(([, h]) => h.length > 90)
      .map(([k, h]) => `${k} (${h.length}): ${h}`);
    expect(tooLong).toEqual([]);
  });

  it('writes finished sentences: no ellipsis, no trailing full stop, no dangling word', () => {
    const bad = Object.entries(CORNERSTONE_HEADLINES).filter(
      ([, h]) => /…$|\.$/.test(h) || /\s(and|or|the|a|an|of|to|in|with)$/.test(h),
    );
    expect(bad).toEqual([]);
  });
});
