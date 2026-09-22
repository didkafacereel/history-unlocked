import { makeDateKey } from '@/lib/dateKey';

/**
 * How far back a reader without Pro may travel.
 *
 * The Time Machine used to be Pro or nothing, and "nothing" had a cost that
 * was easy to miss: a free reader who did not open the app on Thursday lost
 * Thursday until the following year. The streak exists to make them come every
 * day and then punished the first day they missed, and every reminder they
 * failed to tap became a dead end — a notification about an event they could
 * no longer reach.
 *
 * A week of catching up fixes that without giving the archive away, because
 * the depth wall still applies: a free reader on a past date sees the same
 * three events they would have seen on the day. Seven days times three events
 * is not a substitute for Pro; it is the difference between missing a day and
 * losing it.
 *
 * BACKWARDS ONLY. The archive holds all 366 days, tomorrow included, and
 * showing tomorrow would spoil tomorrow's notification — the one thing most
 * likely to bring the reader back.
 */
export const FREE_TIME_MACHINE_DAYS = 7;

/**
 * The "MM-DD" keys a free reader may open, today included.
 *
 * Built by walking real dates backwards rather than by arithmetic on the key,
 * so month lengths, year boundaries and leap days are the calendar's problem
 * and not ours. On 1 March of a non-leap year the window simply never contains
 * 29 February, which is correct: it did not happen.
 */
export function freeReachableDateKeys(now: Date = new Date()): Set<string> {
  const keys = new Set<string>();
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < FREE_TIME_MACHINE_DAYS; i++) {
    keys.add(makeDateKey(cursor.getMonth() + 1, cursor.getDate()));
    cursor.setDate(cursor.getDate() - 1);
  }
  return keys;
}
