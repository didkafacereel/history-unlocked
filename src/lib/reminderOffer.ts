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
