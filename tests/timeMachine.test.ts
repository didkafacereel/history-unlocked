import { describe, expect, it } from 'vitest';

import { FREE_TIME_MACHINE_DAYS, freeReachableDateKeys } from '@/data/timeMachine';

/**
 * The free window is arithmetic on a calendar, which is where this kind of
 * rule goes wrong: month lengths differ, years wrap, and February has a day
 * that exists in one year out of four. Walking real Date objects backwards
 * makes all of that the calendar's problem — these check that it stayed that
 * way.
 */
describe('freeReachableDateKeys', () => {
  it('offers exactly the promised number of days', () => {
    expect(freeReachableDateKeys(new Date(2026, 8, 22)).size).toBe(FREE_TIME_MACHINE_DAYS);
  });

  it('includes today and the six days before it', () => {
    const keys = freeReachableDateKeys(new Date(2026, 8, 22));
    expect([...keys].sort()).toEqual([
      '09-16',
      '09-17',
      '09-18',
      '09-19',
      '09-20',
      '09-21',
      '09-22',
    ]);
  });

  it('never includes tomorrow', () => {
    // The archive holds all 366 days, tomorrow included. Showing it would
    // spoil the notification that is most likely to bring the reader back.
    expect(freeReachableDateKeys(new Date(2026, 8, 22)).has('09-23')).toBe(false);
  });

  it('walks back across the start of a month', () => {
    const keys = freeReachableDateKeys(new Date(2026, 2, 3)); // 3 March 2026
    expect([...keys].sort()).toEqual([
      '02-25',
      '02-26',
      '02-27',
      '02-28',
      '03-01',
      '03-02',
      '03-03',
    ]);
  });

  it('skips 29 February in a year that did not have one', () => {
    // 2026 is not a leap year, so the window over 1 March reaches 23 February
    // and 29 February is simply not among the days that happened.
    const keys = freeReachableDateKeys(new Date(2026, 2, 1));
    expect(keys.has('02-29')).toBe(false);
    expect(keys.has('02-28')).toBe(true);
  });

  it('includes 29 February in a year that did', () => {
    const keys = freeReachableDateKeys(new Date(2028, 2, 1)); // 1 March 2028
    expect(keys.has('02-29')).toBe(true);
  });

  it('walks back across the turn of the year', () => {
    const keys = freeReachableDateKeys(new Date(2026, 0, 2)); // 2 January 2026
    expect([...keys].sort()).toEqual([
      '01-01',
      '01-02',
      '12-27',
      '12-28',
      '12-29',
      '12-30',
      '12-31',
    ]);
  });

  it('ignores the time of day', () => {
    const morning = freeReachableDateKeys(new Date(2026, 8, 22, 0, 1));
    const night = freeReachableDateKeys(new Date(2026, 8, 22, 23, 59));
    expect([...morning].sort()).toEqual([...night].sort());
  });
});
