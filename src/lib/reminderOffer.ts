/**
 * Whether the quiz debrief should ask about the daily reminder.
 *
 * The reminder was opt-in and lived in the profile, ninth panel down, so almost
 * nobody would ever have found the one feature built to bring them back. The
 * moment to ask is the end of the first daily quiz: the reader has just shown
 * interest, and "tomorrow's lead at 08:00?" is a natural next sentence.
 *
 * Only the DAILY quiz — practice and simulations are Pro sittings with no
 * "tomorrow" in them — and only once. Pure, so the rule is testable without
 * AsyncStorage or a notification runtime.
 */
export interface ReminderOfferInput {
  /** The platform can schedule at all. False on web. */
  supported: boolean;
  /** Reminders are already on. */
  enabled: boolean;
  /** The reader has already been asked, whatever they answered. */
  offered: boolean;
  practice: boolean;
  simulation: boolean;
}

export function shouldOfferReminder(input: ReminderOfferInput): boolean {
  return (
    input.supported && !input.enabled && !input.offered && !input.practice && !input.simulation
  );
}

/**
 * Cards read before the FEED asks.
 *
 * The quiz ask alone reached almost nobody: it waits at the end of the day's
 * cards, behind the register and the scenarios, and the owner's own phone never
 * got a single reminder because they had never finished a quiz (28 Sep). Three
 * cards is past the first swipe — the reader has seen what a day holds — and
 * early enough that most people who open the app once get there.
 */
export const FEED_ASK_AFTER = 3;

export interface FeedAskInput {
  supported: boolean;
  enabled: boolean;
  /** Answered the ask anywhere with a yes — or said no at the quiz. */
  offered: boolean;
  /** Already asked in the feed, whatever the answer. */
  askedInFeed: boolean;
  /** Distinct events this reader has opened, ever. */
  readCount: number;
}

/**
 * Whether the feed should ask about the reminder now.
 *
 * Once in the feed. A "not now" here leaves the quiz ask standing as the second
 * and last chance, since someone who has just finished a quiz is answering a
 * different question than someone three cards in.
 */
export function shouldAskInFeed(input: FeedAskInput): boolean {
  return (
    input.supported &&
    !input.enabled &&
    !input.offered &&
    !input.askedInFeed &&
    input.readCount >= FEED_ASK_AFTER
  );
}
