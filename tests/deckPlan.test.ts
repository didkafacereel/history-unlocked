import { describe, expect, it } from 'vitest';

import { planDeck, prominence } from '@/data/deckPlan';
import type { HistoricalEvent } from '@/types/manifest';

/**
 * `planDeck` is the one place that decides what a reader is shown: the lead,
 * the free depth wall, and where the deck opens. Everything else in the feed
 * renders what this returns.
 */
function event(over: Partial<HistoricalEvent> & { id: string; year: number }): HistoricalEvent {
  return {
    dateKey: '06-11',
    era: 'Modern',
    title: `Event ${over.id}`,
    region: 'somewhere',
    category: 'Military & Conflict',
    imageUrl: 'https://upload.wikimedia.org/x.jpg',
    imageCredit: 'Someone · Public domain',
    imageAspect: 1,
    imageSourceUrl: 'https://commons.wikimedia.org/x',
    facts: [],
    quizPool: [],
    ...over,
  } as HistoricalEvent;
}

const noneSeen: Readonly<Record<string, number>> = {};

describe('prominence', () => {
  it('puts a cornerstone out of reach of everything else', () => {
    // 100 vs 8: no amount of reader voting moves the September 11 attacks off
    // 11 September, and the gap is wide enough that no future weighting closes
    // it by accident.
    const cornerstone = event({ id: 'a', year: 2001, cornerstone: true });
    const everythingElse = event({
      id: 'b',
      year: 1900,
      readersChoice: true,
      tactical: true,
      coordinates: { lat: 1, lon: 1 },
      facts: [1, 2, 3, 4, 5].map((n) => ({ id: `f${n}`, icon: '*', text: 'x' })),
      summary: 'x'.repeat(4000),
      quizPool: [{ id: 'q', prompt: 'p', choices: [], payoff: 'y' }],
    } as never);
    expect(prominence(cornerstone)).toBeGreaterThan(prominence(everythingElse));
  });

  it('ranks a readers’ pick above an authored quiz', () => {
    const pick = event({ id: 'a', year: 1, readersChoice: true });
    const authored = event({
      id: 'b',
      year: 2,
      quizPool: [{ id: 'q', prompt: 'p', choices: [], payoff: 'y' }],
    } as never);
    expect(prominence(pick)).toBeGreaterThan(prominence(authored));
  });
});

describe('planDeck', () => {
  const day = [
    event({ id: 'oldest', year: 1500 }),
    event({ id: 'middle', year: 1800 }),
    event({ id: 'strong', year: 1900, cornerstone: true }),
    event({ id: 'newest', year: 2000 }),
  ];

  it('pins the strongest event first, then runs chronologically', () => {
    const plan = planDeck(day, { isPro: true, seen: noneSeen });
    expect(plan.heroId).toBe('strong');
    expect(plan.events[0]?.id).toBe('strong');
    const rest = plan.events.slice(1).map((e) => e.year);
    expect(rest).toEqual([...rest].sort((a, b) => a - b));
  });

  it('gives Pro the whole day and locks nothing', () => {
    const plan = planDeck(day, { isPro: true, seen: noneSeen });
    expect(plan.events).toHaveLength(4);
    expect(plan.lockedCount).toBe(0);
  });

  it('gives a free reader three, and the lead is always one of them', () => {
    const plan = planDeck(day, { isPro: false, seen: noneSeen });
    expect(plan.events).toHaveLength(3);
    expect(plan.lockedCount).toBe(1);
    // A free day is never led by its second-best event.
    expect(plan.events.map((e) => e.id)).toContain('strong');
    expect(plan.heroId).toBe('strong');
  });

  it('opens on the first card the reader has not read', () => {
    const seen = { strong: 20000, oldest: 20000 };
    const plan = planDeck(day, { isPro: true, seen });
    expect(plan.events[plan.startIndex]?.id).toBe('middle');
    expect([...plan.unseenIds].sort()).toEqual(['middle', 'newest']);
  });

  it('counts categories over the WHOLE day, not the narrowed deck', () => {
    const mixed = [
      event({ id: 'a', year: 1, category: 'Science & Technology' }),
      event({ id: 'b', year: 2, category: 'Military & Conflict' }),
      event({ id: 'c', year: 3, category: 'Military & Conflict' }),
    ];
    const plan = planDeck(mixed, { isPro: true, seen: noneSeen, category: 'Military & Conflict' });
    expect(plan.events).toHaveLength(2);
    expect(plan.categoryCounts['Science & Technology']).toBe(1);
  });

  it('ignores a filter that would empty the day rather than obeying it', () => {
    const plan = planDeck(day, { isPro: true, seen: noneSeen, category: 'Sports & Games' });
    expect(plan.events).toHaveLength(4);
  });

  it('survives an empty day', () => {
    const plan = planDeck([], { isPro: false, seen: noneSeen });
    expect(plan.events).toEqual([]);
    expect(plan.heroId).toBeNull();
    expect(plan.startIndex).toBe(0);
  });
});
