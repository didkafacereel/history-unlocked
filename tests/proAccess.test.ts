import { describe, expect, it } from 'vitest';

import { hasProAccess } from '@/lib/proAccess';

/**
 * Two routes to Pro — a purchase, or the launch gift's week — and one answer.
 */
const NOW = Date.UTC(2026, 8, 25, 12);
const DAY = 86_400_000;

describe('hasProAccess', () => {
  it('opens for a purchase, whatever the gift says', () => {
    expect(hasProAccess({ purchased: true, trialEndsAt: null, now: NOW, clockOffset: 0 })).toBe(true);
    expect(hasProAccess({ purchased: true, trialEndsAt: NOW - DAY, now: NOW, clockOffset: 0 })).toBe(true);
  });

  it('opens during the gift week and closes when it ends', () => {
    expect(hasProAccess({ purchased: false, trialEndsAt: NOW + DAY, now: NOW, clockOffset: 0 })).toBe(true);
    expect(hasProAccess({ purchased: false, trialEndsAt: NOW - 1, now: NOW, clockOffset: 0 })).toBe(false);
  });

  it('stays closed with neither', () => {
    expect(hasProAccess({ purchased: false, trialEndsAt: null, now: NOW, clockOffset: 0 })).toBe(false);
  });

  it('judges the end by the server clock, not a phone moved back in time', () => {
    // Phone says a week ago; the server's clock says the week is over.
    const phoneNow = NOW - 7 * DAY;
    const offset = NOW - phoneNow;
    expect(hasProAccess({ purchased: false, trialEndsAt: NOW - DAY, now: phoneNow, clockOffset: offset })).toBe(false);
  });
});
