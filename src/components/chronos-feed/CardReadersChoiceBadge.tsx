import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * "Readers' choice" — the crowd's pick, marked as such.
 *
 * Green, not amber, and never in place of the lead badge. Two labels with two
 * meanings: amber is what the editor put first, green is what readers voted
 * for. On most days they are the same card and both appear; when they differ,
 * the difference is the interesting part and the app should show it rather
 * than pick a side.
 */
export const CardReadersChoiceBadge = memo(function CardReadersChoiceBadge({
  share,
}: {
  share?: number;
}) {
  const percent = share !== undefined ? Math.round(share * 100) : null;

  return (
    <View style={styles.badge}>
      <SegmentedText variant="label" style={styles.label}>
        {percent !== null ? `Readers’ choice · ${percent}%` : 'Readers’ choice'}
      </SegmentedText>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: palette.correct,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    flexShrink: 0,
  },
  label: {
    color: palette.correct,
  },
});
