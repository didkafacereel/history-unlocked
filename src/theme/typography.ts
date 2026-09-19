import { TextStyle } from 'react-native';

import { palette } from './tokens';

/**
 * Type scale tuned for Blinkist-grade density: short line lengths,
 * generous line-height, hard caps on block size (enforced by SegmentedText).
 */
export const type = {
  /** Year numeral on a card — the single loudest element. */
  yearDisplay: {
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '800',
    letterSpacing: -1.5,
    color: palette.textPrimary,
  },
  /**
   * The day's lead. Louder than a normal headline so the front card reads as
   * the front card before a word of it is processed — still capped at two
   * lines, because density is not negotiable even for the lead.
   */
  heroHeadline: {
    fontSize: 32,
    lineHeight: 37,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: palette.textPrimary,
  },
  /** Event title. Max two lines, ever. */
  headline: {
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: palette.textPrimary,
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
export const densityCaps = {
  headlineLines: 2,
  factLines: 2,
  maxFactsPerCard: 4,
} as const;
