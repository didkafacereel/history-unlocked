import { describe, expect, it } from 'vitest';

import { shortHeadline, TITLE_MAX } from '../pipeline/headline';

/**
 * Headlines are cut from the feed's one-line summary. Each step may only
 * DELETE words — a headline can say less than its source, never something
 * else — and "…" is the last resort, not the default.
 */
describe('shortHeadline', () => {
  it('leaves a sentence that fits alone, minus its full stop and "(pictured)"', () => {
    expect(shortHeadline('RMS Titanic (pictured) sank in the North Atlantic.')).toBe(
      'RMS Titanic sank in the North Atlantic',
    );
  });

  it('drops parentheticals before cutting anything', () => {
    const s =
      'Spanish conquistador Francisco Pizarro founded Ciudad de los Reyes (present-day Lima) as the capital of Peru';
    expect(s.length).toBeGreaterThan(TITLE_MAX);
    expect(shortHeadline(s)).toBe(
      'Spanish conquistador Francisco Pizarro founded Ciudad de los Reyes as the capital of Peru',
    );
  });

  it('drops a short leading context label when that is what makes it fit', () => {
    const s =
      'Second World War: Allied forces captured San Marino after the Battle of San Marino ended in their favour';
    const out = shortHeadline(s);
    expect(out.startsWith('Allied forces captured San Marino')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(out.endsWith('…')).toBe(false);
  });

  it('cuts at a clause boundary, never mid-word, when the sentence is still too long', () => {
    const s =
      'The first transatlantic telegraph cable was completed, carrying a message from Queen Victoria to President James Buchanan of the United States';
    expect(shortHeadline(s)).toBe('The first transatlantic telegraph cable was completed');
  });

  it('cuts before a subordinate clause when there is no comma to cut at', () => {
    const s =
      'The siege of Rouen ended with English troops capturing the city from the French after a blockade of six months that starved the defenders';
    expect(shortHeadline(s)).toBe('The siege of Rouen ended with English troops capturing the city from the French');
  });

  it('drops an appositive set off by commas', () => {
    const s =
      'The 3,106-carat Cullinan Diamond, the largest gem-quality rough diamond ever found, was discovered at the Premier Mine in South Africa';
    expect(shortHeadline(s)).toBe('The 3,106-carat Cullinan Diamond was discovered at the Premier Mine in South Africa');
  });

  it('does not half-remove a description that holds a comma of its own', () => {
    const s =
      'The Parliament of 1327, which was instrumental in the transfer of the English Crown from King Edward II to his son, Edward III, began at the Palace of Westminster';
    expect(shortHeadline(s)).not.toContain('1327 Edward');
  });

  it('never ends on a word that needed the clause it cut', () => {
    const a = shortHeadline(
      'The embassy of the United States to Somalia was evacuated by helicopter airlift days before the capital fell to rebel forces',
    );
    const b = shortHeadline(
      'Ukraine International Airlines Flight 752 crashes immediately after takeoff at Tehran, killing all 176 people on board',
    );
    expect(a).not.toMatch(/\sdays$/);
    expect(b).not.toMatch(/\simmediately$/);
  });

  it('takes the first sentence only, and never deletes across a full stop', () => {
    const s =
      'On the Caribbean island of Montserrat, the Soufrière Hills volcano erupts. Over the next several years, it devastates the island, destroying the capital and forcing most of the population to flee';
    expect(shortHeadline(s)).toBe('On the Caribbean island of Montserrat, the Soufrière Hills volcano erupts');
  });

  it('does not stop on a subject and its description before the verb', () => {
    const s =
      'The Greenfield tornado, estimated to have produced winds in excess of 309 miles per hour, struck the town of Greenfield, Iowa, killing five people';
    expect(shortHeadline(s)).not.toMatch(/per hour$/);
  });

  it('keeps the clause that carries the point after "in which"', () => {
    const s =
      'U.S. president Ronald Reagan made a nationally televised address in which he accepted full responsibility for the Iran–Contra affair';
    expect(shortHeadline(s)).not.toBe('U.S. president Ronald Reagan made a nationally televised address');
  });

  it('never keeps only the introductory phrase and drops the main clause', () => {
    const a = shortHeadline(
      'In a conspiracy to replace the Medici family as rulers of the Republic of Florence, the Pazzi family attacked Lorenzo de\' Medici and killed his brother Giuliano during High Mass',
    );
    const b = shortHeadline(
      'In retaliation for the massacre of captured Americans by Waffen SS soldiers, American troops killed about sixty German prisoners of war near Chenogne',
    );
    expect(a).not.toBe('In a conspiracy to replace the Medici family as rulers of the Republic of Florence');
    expect(b).not.toBe('In retaliation for the massacre of captured Americans by Waffen SS soldiers');
  });

  it('never deletes the main clause that follows an introduction', () => {
    const out = shortHeadline(
      'In Operation Iskra, the Red Army established a narrow land corridor to Leningrad, partially easing the protracted German siege of the city',
    );
    expect(out).toContain('the Red Army established');
  });

  it('does not take "Roe v. Wade" for the end of a sentence', () => {
    const out = shortHeadline(
      "The U.S. Supreme Court's landmark decision in Roe v. Wade established a constitutional right to abortion in the United States",
    );
    expect(out).not.toMatch(/Roe v$/);
  });

  it('leaves the middle of a plain list alone', () => {
    const s =
      'Britain, France, Russia and Italy signed an agreement dividing the territories of the Ottoman Empire into zones of influence';
    expect(shortHeadline(s).startsWith('Britain, France, Russia')).toBe(true);
  });

  it('does not split a pair at "and"', () => {
    const s =
      'The first commercial transatlantic telegraph cable between Ireland and Newfoundland entered service for a few weeks';
    expect(shortHeadline(s)).not.toMatch(/Ireland$/);
  });

  it('only then cuts at a word, and says so with "…"', () => {
    const s = `Word ${'verylongword '.repeat(12)}end`;
    const out = shortHeadline(s);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(TITLE_MAX);
  });

  it('never ends on a word that leaves the reader waiting', () => {
    const s =
      'The Conservative Party chose a new leader after a long contest and, within weeks, the government collapsed entirely';
    expect(shortHeadline(s)).not.toMatch(/\s(and|the|a|of|to|in)$/);
  });

  it('keeps a colon that is punctuation, not a label', () => {
    const s = 'The Treaty of Paris was signed, and its first article read: all prisoners shall be released';
    expect(shortHeadline(s).startsWith('The Treaty of Paris was signed')).toBe(true);
  });
});
