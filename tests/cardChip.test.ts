import { describe, expect, it } from 'vitest';

import { contextLine } from '@/lib/eventContext';

/**
 * The chip reads "1987 AD · MODERN · <this>".
 *
 * `region` is filled from the Wikidata description for ~89% of the archive, so
 * it is usually a sentence about the subject rather than a place — and it
 * frequently repeats the year the card is already shouting. The card that
 * started this read "1987 AD · MODERN · 1987 radioactive contamination
 * incident in Brazil".
 */
describe('contextLine', () => {
  it('removes the event’s own year', () => {
    expect(contextLine('1987 radioactive contamination incident in Brazil', 1987)).toBe(
      'radioactive contamination incident in Brazil',
    );
  });

  it('keeps years that are NOT the event’s', () => {
    // A 250 card should still say what the description says about 249–251.
    expect(contextLine('Roman emperor from 249 to 251', 250)).toBe('Roman emperor from 249 to 251');
  });

  it('leaves no dangling preposition after a removal', () => {
    for (const [region, year] of [
      ['treaty signed in 1864', 1864],
      ['campaign of 1917', 1917],
      ['agreement reached on 3 January 1901', 1901],
    ] as const) {
      const out = contextLine(region, year);
      expect(out).not.toMatch(/\s(on|in|of|from|to|since|until|between|by|during|the|a|an)$/i);
    }
  });

  it('leaves no dangling punctuation', () => {
    for (const [region, year] of [
      ['great war, 1914', 1914],
      ['long siege — 1453', 1453],
      ['peasant revolt; 1789', 1789],
    ] as const) {
      const out = contextLine(region, year);
      expect(out).not.toBeNull();
      expect(out!).not.toMatch(/[\s,;:·–—-]$/u);
    }
  });

  it('closes up an emptied bracket', () => {
    const out = contextLine('Battle of Hastings (1066)', 1066);
    expect(out).not.toContain('()');
    expect(out).toBe('Battle of Hastings');
  });

  it('returns null rather than a fragment', () => {
    // "1987 AD · MODERN ·" with an empty tail reads as a rendering fault.
    expect(contextLine('1987', 1987)).toBeNull();
    expect(contextLine('', 1987)).toBeNull();
    expect(contextLine('   ', 1987)).toBeNull();
    expect(contextLine('in 1987', 1987)).toBeNull();
  });

  it('does not cut a year out of a longer number', () => {
    expect(contextLine('population of 19870 people', 1987)).toContain('19870');
  });

  it('leaves an ordinary place description untouched', () => {
    expect(contextLine('country in Western Europe', 1815)).toBe('country in Western Europe');
  });
});
