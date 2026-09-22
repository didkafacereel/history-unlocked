import { TextStyle } from 'react-native';

import { palette } from './tokens';

/**
 * Type scale tuned for Blinkist-grade density: short line lengths,
 * generous line-height, hard caps on block size (enforced by SegmentedText).
 */
/**
 * Carried by every variant that can land on a photograph.
 *
 * The archive is not stock imagery. It holds white marble, snowfields, pale
 * parchment and overexposed press photographs, and white type on any of them
 * disappears — the scrims were tuned against dark stock and cannot be pushed
 * much further without burying the picture the card exists to show.
 *
 * A halo solves the same problem from the other side: it follows the letters,
 * so it costs nothing anywhere the background is already dark. On the panels
 * and sheets where these variants are also used it is simply invisible.
 */
const onImagery = {
  textShadowColor: palette.textHalo,
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 9,
} as const;

export const type = {
  /** Year numeral on a card — the single loudest element. */
  yearDisplay: {
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '800',
    letterSpacing: -1.5,
    color: palette.textPrimary,
    ...onImagery,
  },
  /**
   * The day's lead. Louder than a normal headline so the front card reads as
   * the front card before a word of it is processed — still capped at two
   * lines, because density is not negotiable even for the lead.
   */
  heroHeadline: {
    // 26, not 32. A 90-character title — the schema's maximum — needs five
    // lines at 32 on a 375dp phone, and five lines pushed the year up behind
    // the top bar. At 26 it fits in four and the card holds together.
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: palette.textPrimary,
    ...onImagery,
  },
  /** Event title. Max two lines, ever. */
  headline: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: palette.textPrimary,
    ...onImagery,
  },
  /** A single fact row. One sentence. */
  fact: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '500',
    color: palette.textSecondary,
  },
  /** Chips, badges, rail labels. */
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: palette.textTertiary,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: palette.textTertiary,
  },
} satisfies Record<string, TextStyle>;

/** Density caps — SegmentedText enforces these at the component level. */
/**
 * Line caps, set against what the SCHEMA allows rather than against a
 * viewport that happened to be wide.
 *
 * These were 2 and 2, chosen on a desktop-sized preview where two lines held a
 * whole headline. On a 375dp phone two lines of `heroHeadline` hold about
 * forty characters, and the schema permits ninety — so the archive was
 * routinely handed text the card could not render, and the reader got
 * "Second World War: Allied forces captured San Mari…". A fact may run to 160
 * characters and had the same problem.
 *
 * A presentation cap below the data contract is not density, it is data loss.
 * These now clear their own maxima at phone width; the schema is what keeps a
 * wall of text out, and it still does.
 */
export const densityCaps = {
  /** 90 chars at `headline` size. */
  headlineLines: 4,
  /** 90 chars at `heroHeadline` size. */
  heroHeadlineLines: 4,
  /** 220 chars at `fact` size on a 375dp phone. */
  factLines: 6,
  /** What the SCHEMA allows an event to carry. */
  maxFactsPerCard: 4,
  /**
   * What the CARD shows, which is not the same thing.
   *
   * Facts are whole sentences now rather than clauses, and four of them run to
   * fifteen lines on a phone — enough to push the year and the era chip up
   * behind the top bar on a card that does not scroll. Three fit. The fourth
   * is not lost: the whole panel opens the reader, where nothing is clipped.
   */
  factsShownOnCard: 3,
  /**
   * What the LEAD card shows, which is less again.
   *
   * The day's lead carries a "TODAY'S LEAD" badge and a hero headline the
   * other cards do not: about sixty points more chrome above the same three
   * facts. Measured on a 360×800 phone, that tipped the lead card forty-seven
   * points over the screen, and — because the content is bottom-anchored and
   * overruns upward — the badge came to rest across the intel chip.
   *
   * Two facts on the lead, three elsewhere. The card is a way in, not the
   * account; the panel opens the reader, where nothing is clipped.
   */
  heroFactsShownOnCard: 2,
} as const;
