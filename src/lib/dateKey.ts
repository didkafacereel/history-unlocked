/** Manifest entries are keyed "MM-DD" in the user's local calendar. */
export function todayDateKey(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

/** Streak bookkeeping uses full local dates, "YYYY-MM-DD". */
export function isoDateKey(now: Date = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, '0');
  return `${year}-${todayDateKey(now)}`;
}

/** The local calendar day before an "YYYY-MM-DD" key. */
export function previousIsoDateKey(iso: string): string {
  const [year = 0, month = 1, day = 1] = iso.split('-').map(Number);
  return isoDateKey(new Date(year, month - 1, day - 1));
}

/** Whole days from one "YYYY-MM-DD" to another (positive if `to` is later). */
export function daysBetweenIsoDates(fromIso: string, toIso: string): number {
  const [fy = 0, fm = 1, fd = 1] = fromIso.split('-').map(Number);
  const [ty = 0, tm = 1, td = 1] = toIso.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** "MM-DD" → { month: 1-12, day: 1-31 }. */
export function parseDateKey(dateKey: string): { month: number; day: number } {
  const [month = 1, day = 1] = dateKey.split('-').map(Number);
  return { month, day };
}

export function makeDateKey(month: number, day: number): string {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Days in a 1-12 month. Uses a leap year so 29 February is always selectable. */
export function daysInMonth(month: number): number {
  return new Date(2024, month, 0).getDate();
}

/**
 * Month names, written out rather than formatted.
 *
 * `toLocaleString(undefined, …)` takes the DEVICE's language, and this app is
 * published in English only — so a German phone rendered the Time Machine as
 * "Juni" and a Japanese one as "6月", inside an otherwise entirely English
 * screen. The archive is English; the calendar has to match it.
 */
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Full month name, e.g. 3 → "March". */
export function monthLabel(month: number): string {
  return MONTH_NAMES[month - 1] ?? '';
}

/** "MM-DD" → "11 Jun" for compact UI labels. */
export function shortDateKeyLabel(dateKey: string): string {
  const { month, day } = parseDateKey(dateKey);
  return `${day} ${monthLabel(month).slice(0, 3)}`;
}
