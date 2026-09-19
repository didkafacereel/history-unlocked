import { describe, expect, it } from 'vitest';

import { seededShuffle } from '@/data/quizGeneration';
import { tierStanding } from '@/data/collectionTiers';
import { dateKeyFromPayload } from '@/services/notifications';

describe('seededShuffle', () => {
  // This exists because 87.7% of 6017 authored questions had the correct
  // answer at index 0. Tapping the first option without reading scored 88%,
  // and it was caught only by playing a round. Any future LLM-generated
  // multiple choice must be shuffled at ingest.
  const items = ['a', 'b', 'c', 'd'];

  it('is deterministic for a given seed', () => {
    expect(seededShuffle(items, 'evt-1')).toEqual(seededShuffle(items, 'evt-1'));
  });

  it('gives different orders to different seeds', () => {
    const seeds = ['evt-1', 'evt-2', 'evt-3', 'evt-4', 'evt-5', 'evt-6'];
    const orders = new Set(seeds.map((s) => seededShuffle(items, s).join('')));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('is a permutation — nothing lost, nothing duplicated', () => {
    for (const seed of ['x', 'y', 'z']) {
      expect([...seededShuffle(items, seed)].sort()).toEqual([...items].sort());
    }
  });

  it('does not mutate its input', () => {
    const original = [...items];
    seededShuffle(items, 'seed');
    expect(items).toEqual(original);
  });

  it('spreads the correct answer across all four positions', () => {
    // The real defect was distributional, so the guard has to be too.
    const counts = [0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) {
      const order = seededShuffle(items, `evt-${i}`);
      counts[order.indexOf('a')]!++;
    }
    for (const n of counts) {
      expect(n / 4000).toBeGreaterThan(0.2);
      expect(n / 4000).toBeLessThan(0.3);
    }
  });

  it('handles the degenerate sizes', () => {
    expect(seededShuffle([], 'seed')).toEqual([]);
    expect(seededShuffle(['only'], 'seed')).toEqual(['only']);
  });
});

describe('tierStanding', () => {
  // Days of Loss holds 1048 cards. A bar reading "4 of 1048" tells a reader
  // this is not for them, so tiers turn one unreachable target into four
  // reachable ones. Thresholds are absolute, never percentages.
  it('offers Bronze before anything is read', () => {
    const s = tierStanding(0, 500);
    expect(s.reached).toBeNull();
    expect(s.next?.name).toBe('Bronze');
    expect(s.remaining).toBe(10);
  });

  it('advances through the tiers', () => {
    expect(tierStanding(10, 500).reached?.name).toBe('Bronze');
    expect(tierStanding(49, 500).next?.name).toBe('Silver');
    expect(tierStanding(150, 500).reached?.name).toBe('Gold');
  });

  it('never offers a tier the set cannot supply', () => {
    // "Silver at 50" for a set of 22 is a target the archive cannot meet,
    // which is the same defect tiers exist to fix.
    const s = tierStanding(5, 22);
    expect(s.next?.name).toBe('Bronze');
    expect(tierStanding(10, 22).next).toBeNull();
  });

  it('reports completion', () => {
    expect(tierStanding(22, 22).complete).toBe(true);
    expect(tierStanding(21, 22).complete).toBe(false);
  });
});

describe('dateKeyFromPayload', () => {
  // The reminder has always carried the date it fired for; nothing read it
  // until now, so a notification tapped after midnight opened the wrong day.
  it('reads the date out of the scheduled url', () => {
    expect(dateKeyFromPayload({ url: '/?date=09-18' })).toBe('09-18');
    expect(dateKeyFromPayload({ url: '/?foo=1&date=12-25' })).toBe('12-25');
  });

  it('returns null for anything else, without throwing', () => {
    for (const bad of [null, undefined, 42, 'string', {}, { url: 5 }, { url: '/?date=bogus' }]) {
      expect(dateKeyFromPayload(bad)).toBeNull();
    }
  });
});
