import { describe, expect, it } from 'vitest';

import { shouldOfferReminder } from '@/lib/reminderOffer';

/**
 * The ask happens once, after the first DAILY quiz, on a platform that can
 * schedule — and never to someone who already has the reminder on.
 */
const base = {
  supported: true,
  enabled: false,
  offered: false,
  practice: false,
  simulation: false,
};

describe('shouldOfferReminder', () => {
  it('asks after a first daily quiz', () => {
    expect(shouldOfferReminder(base)).toBe(true);
  });

  it('asks only once, whatever the answer was', () => {
    expect(shouldOfferReminder({ ...base, offered: true })).toBe(false);
  });

  it('never asks someone whose reminder is already on', () => {
    expect(shouldOfferReminder({ ...base, enabled: true })).toBe(false);
  });

  it('never asks where nothing can be scheduled — the web', () => {
    expect(shouldOfferReminder({ ...base, supported: false })).toBe(false);
  });

  it('never asks after practice or a simulation, which have no "tomorrow"', () => {
    expect(shouldOfferReminder({ ...base, practice: true })).toBe(false);
    expect(shouldOfferReminder({ ...base, simulation: true })).toBe(false);
  });
});
