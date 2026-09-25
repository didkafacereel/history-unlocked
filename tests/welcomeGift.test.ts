import { describe, expect, it } from 'vitest';

import { decideWelcome } from '../firebase/functions/src/welcome';

/**
 * The launch gift: a week of Pro for the first 5,000 readers to sign in. The
 * transaction around this is proven against the emulator; these are the rules.
 */
const NOW = Date.UTC(2026, 8, 25, 12);
const WEEK = 7 * 24 * 60 * 60 * 1000;

describe('decideWelcome', () => {
  it('grants the first reader number 1, for exactly seven days', () => {
    expect(decideWelcome({ existing: null, granted: 0, now: NOW })).toEqual({
      action: 'grant',
      grant: { number: 1, startedAt: NOW, endsAt: NOW + WEEK },
    });
  });

  it('numbers readers in order', () => {
    const d = decideWelcome({ existing: null, granted: 1283, now: NOW });
    expect(d.action === 'grant' && d.grant.number).toBe(1284);
  });

  it('gives an account one week, ever — a second claim returns the first', () => {
    const first = { number: 7, startedAt: NOW - 3 * 86_400_000, endsAt: NOW + 4 * 86_400_000 };
    expect(decideWelcome({ existing: first, granted: 900, now: NOW })).toEqual({
      action: 'existing',
      grant: first,
    });
  });

  it('does not restart an expired week', () => {
    const old = { number: 7, startedAt: NOW - 30 * 86_400_000, endsAt: NOW - 23 * 86_400_000 };
    expect(decideWelcome({ existing: old, granted: 900, now: NOW }).action).toBe('existing');
  });

  it('stops at the cap: the 5,000th gets one, the 5,001st does not', () => {
    expect(decideWelcome({ existing: null, granted: 4999, now: NOW }).action).toBe('grant');
    expect(decideWelcome({ existing: null, granted: 5000, now: NOW })).toEqual({ action: 'sold-out' });
  });
});
