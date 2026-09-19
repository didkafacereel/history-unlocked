import { describe, expect, it } from 'vitest';

import {
  daysBetweenIsoDates,
  daysInMonth,
  isoDateKey,
  makeDateKey,
  monthLabel,
  parseDateKey,
  previousIsoDateKey,
  shortDateKeyLabel,
  todayDateKey,
} from '@/lib/dateKey';
import { formatCount } from '@/lib/formatCount';

describe('date keys', () => {
  it('reads the LOCAL calendar, not UTC', () => {
    // A UTC-based key puts a reader in Auckland on yesterday's events for most
    // of their day, which for a "what happened on this date" app is the whole
    // product being wrong.
    const lateEvening = new Date(2026, 2, 9, 23, 30);
    expect(todayDateKey(lateEvening)).toBe('03-09');
    expect(isoDateKey(lateEvening)).toBe('2026-03-09');
  });

  it('pads single digits', () => {
    expect(todayDateKey(new Date(2026, 0, 5))).toBe('01-05');
    expect(makeDateKey(1, 5)).toBe('01-05');
  });

  it('steps back across a month boundary', () => {
    expect(previousIsoDateKey('2026-03-01')).toBe('2026-02-28');
    expect(previousIsoDateKey('2026-01-01')).toBe('2025-12-31');
  });

  it('steps back across a leap day', () => {
    expect(previousIsoDateKey('2024-03-01')).toBe('2024-02-29');
  });

  it('counts whole days between dates, including across a year', () => {
    expect(daysBetweenIsoDates('2026-03-01', '2026-03-02')).toBe(1);
    expect(daysBetweenIsoDates('2026-03-02', '2026-03-01')).toBe(-1);
    expect(daysBetweenIsoDates('2025-12-31', '2026-01-01')).toBe(1);
    expect(daysBetweenIsoDates('2026-03-01', '2026-03-01')).toBe(0);
  });

  it('keeps 29 February selectable', () => {
    expect(daysInMonth(2)).toBe(29);
    expect(daysInMonth(4)).toBe(30);
    expect(daysInMonth(12)).toBe(31);
  });

  it('parses a key back to numbers', () => {
    expect(parseDateKey('07-04')).toEqual({ month: 7, day: 4 });
  });
});

describe('English-only formatting', () => {
  // The app is published in English only. `toLocaleString(undefined, ...)`
  // follows the DEVICE language, so a German phone rendered the Time Machine
  // as "Juni" and a Japanese one as "6月", inside otherwise English screens.
  it('names months in English regardless of the host locale', () => {
    expect(monthLabel(6)).toBe('June');
    expect(monthLabel(1)).toBe('January');
    expect(monthLabel(12)).toBe('December');
  });

  it('abbreviates in English', () => {
    expect(shortDateKeyLabel('06-11')).toBe('11 Jun');
    expect(shortDateKeyLabel('12-01')).toBe('1 Dec');
  });

  it('is total over 1..12 and yields nothing outside it', () => {
    for (let m = 1; m <= 12; m++) expect(monthLabel(m).length).toBeGreaterThan(2);
    expect(monthLabel(0)).toBe('');
    expect(monthLabel(13)).toBe('');
  });

  it('groups thousands with commas, not the device separator', () => {
    expect(formatCount(8056)).toBe('8,056');
    expect(formatCount(999)).toBe('999');
    expect(formatCount(1000)).toBe('1,000');
    expect(formatCount(1234567)).toBe('1,234,567');
    expect(formatCount(0)).toBe('0');
  });
});
