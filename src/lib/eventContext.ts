/**
 * The context line on a card, cleaned of what the card already says.
 *
 * `region` does not hold a region. The free pipeline fills it with the linked
 * article's Wikidata description, and that is documented in `pipeline/lite.ts`
 * — 49% of the archive reads like "Global conflict from 1939 to 1945" or
 * "1987 radioactive contamination incident in Brazil" rather than a place.
 *
 * As context that is often genuinely useful, so it stays. What has to go is the
 * DATE inside it, because the chip already prints the year an inch to the left:
 *
 *   1987 AD · MODERN · 1987 radioactive contamination incident in Brazil
 *   1939 AD · MODERN · Global conflict from 1939 to 1945
 *
 * Reading your own year back to you twice in one chip is the kind of small
 * wrongness that makes a product feel automated. Stripped, those become
 * "radioactive contamination incident in Brazil" and "Global conflict".
 *
 * Only the event's OWN year is removed. A description that names a different
 * year is telling you something ("Roman emperor from 249 to 251" on a 250
 * event keeps its span, because the span is the fact) — so the rule is
 * deliberately narrow: drop a date only when it is the year already displayed,
 * or a range that starts on it.
 */

const MONTHS =
  'January|February|March|April|May|June|July|August|September|October|November|December';

/**
 * Remove the event's own year wherever it appears, then tidy what that leaves.
 *
 * The tidying is not cosmetic. Deleting a year mid-sentence strands whatever
 * introduced it: "Earthquake in Kazakhstan on 3 January 1911" becomes
 * "…on 3 January", and "from 1924 to 1953" becomes "from 1924 to". A rule that
 * cleans half a phrase is worse than one that leaves the phrase alone, so every
 * strip is followed by a pass that removes the dangling connective.
 */
function stripYear(text: string, year: number): string {
  const y = String(Math.abs(year));
  let out = text;

  // A full date first, so the day and month go with the year rather than being
  // left behind: "on 3 January 1911", "on January 3, 1911".
  out = out.replace(
    new RegExp(`\\s*\\b(on|in)\\s+\\d{1,2}\\s+(${MONTHS})\\s+${y}\\b`, 'gi'),
    '',
  );
  out = out.replace(
    new RegExp(`\\s*\\b(on|in)\\s+(${MONTHS})\\s+\\d{1,2},?\\s+${y}\\b`, 'gi'),
    '',
  );
  // Then spans, in BOTH directions and with or without "from". A bare range
  // whose closing year is the event's ("1864–1865 war between Brazil and
  // Uruguay") is the common shape, and matching only the opening year left
  // "1864– war between Brazil and Uruguay" on the card.
  out = out.replace(new RegExp(`\\s*\\(?\\b(from\\s+)?${y}\\s*(?:to|[–—-])\\s*\\d{2,4}\\)?`, 'gi'), '');
  out = out.replace(
    new RegExp(`\\s*\\(?\\b(from\\s+)?\\d{3,4}\\s*(?:to|[–—-])\\s*${y}\\)?`, 'gi'),
    '',
  );
  // Then any remaining standalone occurrence, wherever it sits.
  out = out.replace(new RegExp(`\\b${y}\\b`, 'g'), '');

  return tidy(out);
}

/** Close up what a removal left behind. */
function tidy(text: string): string {
  let out = text
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Repeated, because removals can strand two words ("from … to" → "from").
  for (let pass = 0; pass < 3; pass++) {
    const before = out;
    out = out
      .replace(/[\s,;:·–—-]+$/u, '')
      .replace(/\s+\b(on|in|of|from|to|since|until|between|by|during|the|a|an)\b$/i, '')
      /**
       * And the same at the FRONT, which was missing.
       *
       * Found by running this over all 8,056 events rather than over examples:
       * "1919 and 1920 battles in the Polish–Soviet War" lost its own year and
       * went onto the card as "and 1920 battles in the Polish–Soviet War".
       * Same family as the "1864–" regression, opposite end of the string.
       *
       * LOWERCASE ONLY, and that is the whole safety of it. "The Troubles",
       * "In vitro fertilisation" and "On the Origin of Species" are titles that
       * genuinely open with one of these words; a capital letter is what tells
       * a title apart from a connective left over from mid-sentence.
       */
      .replace(/^[\s,;:·–—-]+/u, '')
      .replace(/^(and|or|on|in|of|from|to|since|until|between|by|during|the|a|an)\b\s+/, '')
      .trim();
    if (out === before) {
      break;
    }
  }
  return out;
}

/**
 * The text after the era on a card's context chip, or null when nothing useful
 * is left. A chip reading "1987 AD · MODERN ·" with an empty tail is worse than
 * one reading "1987 AD · MODERN".
 */
export function contextLine(region: string, year: number): string | null {
  const cleaned = stripYear(region.trim(), year);
  // Three characters cannot say anything, and a leftover fragment reads as a
  // rendering fault rather than as context.
  return cleaned.length >= 4 ? cleaned : null;
}
