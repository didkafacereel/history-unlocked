import { DailyReminderService } from './shared';

/**
 * Daily reminder — the web/no-op side of the platform split.
 *
 * `expo-notifications` cannot schedule on web, and importing it here would pull
 * native modules into the web bundle. The real implementation lives in
 * `index.native.ts`, which Metro picks for iOS and Android only; everything on
 * web sees these stubs and the settings UI reports the feature as unavailable.
 *
 * Types and pure helpers come from `./shared`, NOT from each other: on native,
 * `./index` resolves to `index.native.ts`, so the two halves importing from
 * "the other one" is really each importing itself. That crashed the first
 * device build with "Maximum call stack size exceeded". See shared.ts.
 */

export type { DailyReminderService, ScheduledBrief } from './shared';
export { briefFor, dateKeyFromPayload } from './shared';

export const dailyReminders: DailyReminderService = {
  supported: false,
  requestPermission: async () => false,
  schedule: async () => {},
  cancelAll: async () => {},
};

/**
 * Report the date of a tapped reminder — the web/no-op side.
 *
 * The scheduled payload has always carried `{ url: "/?date=MM-DD" }`, and
 * nothing ever read it: there was no response listener anywhere in the app and
 * the feed route never looked at its params. A reminder therefore opened
 * whatever day the app happened to be on. Harmless at 09:00 on the day it
 * fired, wrong for one tapped after midnight, and wrong for every reminder a
 * reader lets pile up.
 */
export function subscribeToReminderTaps(_onOpen: (dateKey: string) => void): () => void {
  return () => {};
}
