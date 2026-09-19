import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { contextLine } from '@/lib/eventContext';
import { palette, radius, spacing } from '@/theme/tokens';
import { Era } from '@/types/manifest';

/** "1944 AD · MODERN · NORMANDY, FRANCE" context chip. */
interface CardEraBadgeProps {
  year: number;
  era: Era;
  region: string;
}

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : `${year} AD`;
}

export const CardEraBadge = memo(function CardEraBadge({ year, era, region }: CardEraBadgeProps) {
  // The chip states the year; `contextLine` takes it back out of the text so it
  // is not read twice in one breath. See that module for why `region` is not
  // a region.
  const context = contextLine(region, year);

  return (
    <View style={styles.badge}>
      <SegmentedText variant="label" style={styles.accent}>
        {formatYear(year)}
      </SegmentedText>
      <View style={styles.divider} />
      <SegmentedText variant="label" style={styles.context}>
        {context ? `${era} · ${context}` : era}
      </SegmentedText>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    // Glass, not the translucent amber: the badge sits high on the card where
    // the scrim is still thin, so it needs its own dark base to stay readable
    // over bright archival paintings.
    backgroundColor: palette.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    gap: spacing.sm,
    // Long regions ("Philadelphia, American Colonies") would otherwise push the
    // chip past the card edge instead of ellipsizing inside it. `flexShrink`
    // extends that to the row it shares with the NEW pill.
    maxWidth: '100%',
    flexShrink: 1,
  },
  accent: {
    color: palette.accent,
    // The year is the anchor of the chip — only the region may ellipsize.
    flexShrink: 0,
  },
  context: {
    color: palette.textSecondary,
    flexShrink: 1,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 12,
    backgroundColor: palette.glassBorder,
  },
});
