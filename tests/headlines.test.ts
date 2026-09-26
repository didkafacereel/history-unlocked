import { describe, expect, it } from 'vitest';

import { titleFromSummary } from '../pipeline/lite';

/**
 * Every case below is a headline this function actually shipped wrong.
 *
 * It cut at the first comma inside the 90-character window without looking at
 * what it was cutting through, which put 57 broken titles on cards: 51 ending
 * mid-parenthesis and 6 ending on a conjunction. Two later attempts to fix it
 * broke different things, which is why the suite exists.
 */
describe('titleFromSummary', () => {
  const brackets = (s: string) =>
    s.split('(').length === s.split(')').length && s.split('[').length === s.split(']').length;

  it('leaves a short summary alone', () => {
    expect(titleFromSummary('The Reichstag fire was an arson attack.')).toBe(
      'The Reichstag fire was an arson attack',
    );
  });

  it('never ends on an unclosed bracket', () => {
    const out = titleFromSummary(
      'Francisco Pizarro founded Ciudad de los Reyes (present-day Lima, Peru), which became the capital of the Spanish viceroyalty.',
    );
    expect(brackets(out)).toBe(true);
    expect(out).not.toMatch(/\($/);
  });

  it('drops a parenthetical that would not fit, and keeps the sentence whole', () => {
    // Was "The Reichstag fire…" until 26 September: the aside was cut with
    // everything after it. Removing the aside is the first thing a too-long
    // headline gives up now (pipeline/headline.ts), and the sentence survives.
    const out = titleFromSummary(
      'The Reichstag fire (German: Reichstagsbrand, pronounced approximately as raikhstahks-brahnt by German speakers) was an arson attack.',
    );
    expect(out).toBe('The Reichstag fire was an arson attack');
  });

  it('gives up an aside before it gives up the sentence', () => {
    const out = titleFromSummary(
      'The Reichstag fire (German: Reichstagsbrand) was an arson attack on the Reichstag building, home of the German parliament.',
    );
    expect(brackets(out)).toBe(true);
    expect(out).toBe('The Reichstag fire was an arson attack on the Reichstag building');
  });

  it('never ends on a conjunction', () => {
    const out = titleFromSummary(
      'British Prime Minister Margaret Thatcher resigns as leader of the Conservative Party and, consequently, as prime minister of the United Kingdom.',
    );
    expect(out).not.toMatch(/\band$/);
  });

  it('keeps a trailing capital that belongs to a name', () => {
    // "MV Karine A" is the ship. A case-insensitive dangling-word rule ate the
    // "A" as if it were an article.
    const out = titleFromSummary('Second Intifada: Israeli forces seized MV Karine A');
    expect(out).toBe('Second Intifada: Israeli forces seized MV Karine A');
  });

  it('keeps words that can legitimately close a clause', () => {
    // "over" and "under" were in an early dangling list and produced nonsense.
    expect(titleFromSummary('The Sierra Leone Civil War is declared over')).toMatch(/over$/);
  });

  it('strips the feed’s "(pictured)" marker', () => {
    expect(titleFromSummary('Marie Curie (pictured) was awarded the Nobel Prize')).toBe(
      'Marie Curie was awarded the Nobel Prize',
    );
  });

  it('stays within the 90-character schema limit', () => {
    const long =
      'On this day an extraordinarily long encyclopaedia sentence began, and it continued well past any reasonable headline length, describing several things at once.';
    expect(titleFromSummary(long).length).toBeLessThanOrEqual(90);
  });

  it('marks a mid-phrase cut with an ellipsis', () => {
    const out = titleFromSummary(
      'Supercalifragilistic expialidocious antidisestablishmentarianism floccinaucinihilipilification pneumonoultramicroscopicsilicovolcanoconiosis happened today',
    );
    expect(out.endsWith('…')).toBe(true);
  });

  it('never turns a non-empty summary into an empty headline', () => {
    for (const s of ['(', 'and', 'The (', 'a, b', '((()))']) {
      expect(titleFromSummary(s).trim().length).toBeGreaterThan(0);
    }
  });

  it('passes an empty summary straight through, rather than inventing one', () => {
    // The Zod gate at publish should reject that event loudly; a headline
    // conjured here would hide a content bug instead.
    expect(titleFromSummary('   ')).toBe('');
  });
});
