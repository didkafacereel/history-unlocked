import { HistoricalEvent } from '@/types/manifest';

/**
 * Where a reader's "you missed something" report goes.
 *
 * Deliberately backendless. The value of a suggestion box is not the form, it is
 * the editor acting on it — so this ships as a prefilled composer today and can
 * become a real endpoint the day one exists, by setting one variable. Building
 * the server first would be paying for infrastructure before knowing whether
 * anyone writes in.
 *
 * Nothing is hardcoded: with neither variable set the button does not render at
 * all, rather than opening a composer addressed to nobody.
 *
 *   EXPO_PUBLIC_FEEDBACK_FORM_URL   a web form; the date is appended as ?date=
 *   EXPO_PUBLIC_FEEDBACK_EMAIL      fallback, opens the mail composer
 *
 * NEITHER IS SET FOR LAUNCH, and that is a decision rather than an oversight:
 * an inbox is a commitment to answer it, and the intent is an in-app channel in
 * a later update instead. The paywall's feature list was corrected to match —
 * it used to offer "suggest one the archive is missing". Anyone wiring this up
 * later should put that clause back at the same time.
 */

const FORM_URL = process.env.EXPO_PUBLIC_FEEDBACK_FORM_URL?.trim() || null;
const EMAIL = process.env.EXPO_PUBLIC_FEEDBACK_EMAIL?.trim() || null;

export const feedbackConfigured = Boolean(FORM_URL || EMAIL);

/**
 * Mail bodies get truncated by some clients well before the URL limit, so the
 * digest is capped rather than complete — enough for the editor to see what the
 * day already holds without the message being cut mid-sentence.
 */
const DIGEST_EVENTS = 10;
const DIGEST_TITLE = 46;

/**
 * The single most useful thing the message can carry is WHAT IS ALREADY THERE.
 * Without it the inbox fills with "you're missing D-Day" about days where D-Day
 * is card seven, and every report costs a manual lookup before it can be judged.
 */
function digest(events: readonly HistoricalEvent[]): string {
  const lines = events
    .slice()
    .sort((a, b) => a.year - b.year)
    .slice(0, DIGEST_EVENTS)
    .map((e) => {
      const year = e.year < 0 ? `${Math.abs(e.year)} BCE` : String(e.year);
      const title =
        e.title.length > DIGEST_TITLE ? `${e.title.slice(0, DIGEST_TITLE - 1)}…` : e.title;
      return `  ${year} — ${title}`;
    });

  const remainder = events.length - lines.length;
  if (remainder > 0) {
    lines.push(`  …and ${remainder} more`);
  }
  return lines.join('\n');
}

export interface SuggestionContext {
  dateKey: string;
  dateLabel: string;
  events: readonly HistoricalEvent[];
}

function bodyFor({ dateKey, dateLabel, events }: SuggestionContext): string {
  return [
    `Suggested addition for ${dateLabel} (${dateKey})`,
    '',
    'What happened, and why it belongs:',
    '',
    '',
    '— — —',
    `Already on this date (${events.length} events):`,
    digest(events),
  ].join('\n');
}

/** The URL to open, or null when no destination is configured. */
export function suggestionUrl(context: SuggestionContext): string | null {
  if (FORM_URL) {
    const separator = FORM_URL.includes('?') ? '&' : '?';
    return `${FORM_URL}${separator}date=${encodeURIComponent(context.dateKey)}`;
  }
  if (!EMAIL) {
    return null;
  }
  const subject = `History Unlocked — suggestion for ${context.dateLabel}`;
  return (
    `mailto:${EMAIL}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(bodyFor(context))}`
  );
}

/** The same text, for the clipboard fallback when nothing can open a composer. */
export function suggestionText(context: SuggestionContext): string {
  return bodyFor(context);
}
