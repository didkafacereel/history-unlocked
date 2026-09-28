import { describe, expect, it } from 'vitest';

import { FEED_ASK_AFTER, shouldAskInFeed, shouldOfferReminder } from '@/lib/reminderOffer';

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

describe('shouldAskInFeed', () => {
  const feed = { supported: true, enabled: false, offered: false, askedInFeed: false, readCount: 3 };

  it('asks once the reader is three cards in', () => {
    expect(shouldAskInFeed(feed)).toBe(true);
    expect(shouldAskInFeed({ ...feed, readCount: FEED_ASK_AFTER - 1 })).toBe(false);
  });

  it('asks in the feed only once', () => {
    expect(shouldAskInFeed({ ...feed, askedInFeed: true })).toBe(false);
  });

  it('never asks someone who has it on, or said yes at the quiz', () => {
    expect(shouldAskInFeed({ ...feed, enabled: true })).toBe(false);
    expect(shouldAskInFeed({ ...feed, offered: true })).toBe(false);
  });

  it('never asks on the web', () => {
    expect(shouldAskInFeed({ ...feed, supported: false })).toBe(false);
  });

  it('still asks a reader with a long history who was never asked', () => {
    expect(shouldAskInFeed({ ...feed, readCount: 400 })).toBe(true);
  });
});
