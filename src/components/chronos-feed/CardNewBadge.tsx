import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * "NEW TO YOU" marker on an event the reader has never opened.
 *
 * The whole point of the reading library is that a returning reader can see,
 * at a glance, that the day is not a rerun — so this badge sits beside the era
 * chip, in accent, where the eye lands first. It is deliberately absent (not
 * greyed out) on read cards: a wall of "READ" markers would make a rich day
 * look exhausted.
 */
export const CardNewBadge = memo(function CardNewBadge() {
  return (
    <View style={styles.badge} accessibilityLabel="You have not read this event before">
      <SegmentedText variant="label" style={styles.label}>
        ✦ New
      </SegmentedText>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    flexShrink: 0,
  },
  label: {
    color: palette.void,
  },
});
