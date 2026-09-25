import { describe, expect, it } from 'vitest';

import { decideReviewer, decideWelcome, isReviewerEmail, REVIEW_DAYS } from '../firebase/functions/src/welcome';

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

/**
 * Store review access: the Play review account gets Pro from the server,
 * outside the 5,000 (number 0), because reviewers will not buy or take a trial.
 */
const DAY = 24 * 60 * 60 * 1000;

describe('isReviewerEmail', () => {
  it('matches an address on the list, ignoring case and spaces', () => {
    expect(isReviewerEmail('Review@Example.com', ' other@x.com , review@example.com ')).toBe(true);
  });

  it('refuses everything when the list is empty or the address is missing', () => {
    expect(isReviewerEmail('review@example.com', '')).toBe(false);
    expect(isReviewerEmail('review@example.com', undefined)).toBe(false);
    expect(isReviewerEmail(null, 'review@example.com')).toBe(false);
  });

  it('does not match a longer address that merely contains a listed one', () => {
    expect(isReviewerEmail('xreview@example.com', 'review@example.com')).toBe(false);
  });
});

describe('decideReviewer', () => {
  it('grants long access, numbered 0 so it is not one of the 5,000', () => {
    expect(decideReviewer({ existing: null, now: NOW })).toEqual({
      action: 'grant',
      grant: { number: 0, startedAt: NOW, endsAt: NOW + REVIEW_DAYS * DAY },
    });
  });

  it('replaces an ordinary week taken before the account was listed', () => {
    const week = { number: 12, startedAt: NOW, endsAt: NOW + WEEK };
    expect(decideReviewer({ existing: week, now: NOW }).grant.endsAt).toBe(NOW + REVIEW_DAYS * DAY);
  });

  it('keeps a review grant that still has most of its length', () => {
    const held = { number: 0, startedAt: NOW, endsAt: NOW + REVIEW_DAYS * DAY };
    expect(decideReviewer({ existing: held, now: NOW + 30 * DAY })).toEqual({ action: 'existing', grant: held });
  });
});
