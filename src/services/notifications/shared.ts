import { HistoricalEvent } from '@/types/manifest';

/**
 * The half of the reminder service that has no platform in it.
 *
 * This file exists because of a crash that only a device could show. Both
 * halves of the split used to take their types and pure helpers from
 * `./index`, and on native `./index` resolves to `index.native.ts` — the
 * platform extension wins, so the module was importing itself. Metro followed
 * the cycle until the stack ran out: "Maximum call stack size exceeded". On
 * web the same line is harmless, because there `./index` really is index.ts.
 *
 * A file with no `.native` twin cannot be shadowed, so both sides can share it
 * safely. Nothing here may import `expo-notifications`, or the web bundle
 * pulls in native modules again.
 */

export interface ScheduledBrief {
  /** "MM-DD" the notification will fire for. */
  dateKey: string;
  /** Notification title — the year, which is the hook. */
  title: string;
  /** Notification body — the place, and the question. */
  headline: string;
}

export interface DailyReminderService {
  /** Whether this platform can schedule at all. */
  readonly supported: boolean;
  /** Ask the OS. Resolves false if the reader declines. */
  requestPermission: () => Promise<boolean>;
  /** Replace all scheduled briefs with these, at `hour`:`minute` local time. */
  schedule: (briefs: readonly ScheduledBrief[], hour: number, minute: number) => Promise<void>;
  /** Remove everything this app scheduled. */
  cancelAll: () => Promise<void>;
}

/** The "MM-DD" inside a scheduled payload's `url`, when it holds one. */
export function dateKeyFromPayload(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const url = (data as { url?: unknown }).url;
  if (typeof url !== 'string') {
    return null;
  }
  const match = /[?&]date=(\d{2}-\d{2})\b/.exec(url);
  return match?.[1] ?? null;
}

/**
 * Turn the next N days of the archive into notification copy.
 *
 * Shared by both platforms because it is pure: the lead of a date is whatever
 * scores highest, which is exactly what the feed will show when the reader taps
 * through. A generic "see what happened today" would be easier and would be
 * ignored within a week.
 *
 * The year moves into the TITLE, where it is the hook. "Today in history" is
 * the same three words every morning and stops being read within a week;
 * "Today, in 1941" is different every day and is a reason to look down.
 *
 * The body stays the real headline. A curiosity-gap version was written and
 * then withdrawn after reading its own output against the archive: the only
 * non-spoiling detail available was `region`, and `region` is filled from the
 * Wikidata description rather than a place — so the teaser came out as
 * "Emancipation Proclamation. Do you know what happened?", which hands over
 * the answer, and "Roman emperor from 249 to 251. Do you know what happened?",
 * which is not a place at all. Withholding needs something true and specific
 * left to withhold, and the archive does not reliably have one. The event
 * itself is the strongest thing this app owns; say it.
 */
export function briefFor(
  dateKey: string,
  events: readonly HistoricalEvent[],
): ScheduledBrief | null {
  const lead = events[0];
  if (!lead) {
    return null;
  }
  const year = lead.year < 0 ? `${Math.abs(lead.year)} BCE` : String(lead.year);
  return { dateKey, title: `Today, in ${year}`, headline: lead.title };
}
