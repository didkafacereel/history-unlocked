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

  it('leaves no orphaned connective at the FRONT after a removal', () => {
    // Found by sweeping all 8,056 events rather than by example: stripping the
    // year out of "1919 and 1920 battles in the Polish–Soviet War" left the
    // card reading "and 1920 battles in the Polish–Soviet War". Same family as
    // the "1864–" regression, opposite end of the string.
    expect(contextLine('1919 and 1920 battles in the Polish–Soviet War', 1919)).toBe(
      '1920 battles in the Polish–Soviet War',
    );
  });

  it('does not eat a title that legitimately begins with one of those words', () => {
    // The safety of the rule above is that it only strips a LOWERCASE opener.
    // These are real regions in the archive and all three must survive intact.
    expect(contextLine('The Troubles', 1998)).toBe('The Troubles');
    expect(contextLine('In vitro fertilisation', 1978)).toBe('In vitro fertilisation');
    expect(contextLine('On the Origin of Species', 1859)).toBe('On the Origin of Species');
    expect(contextLine('The Holocaust in Greece', 1943)).toBe('The Holocaust in Greece');
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
