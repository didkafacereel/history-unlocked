import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { shortDateKeyLabel } from '@/lib/dateKey';
import { spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/** Shown when a Time Machine date has no events archived yet. */
export const FeedEmptyState = memo(function FeedEmptyState({ dateKey }: { dateKey: string | null }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.glyph}>🗓️</Text>
      <Text style={[type.headline, styles.centered]}>
        {dateKey ? `Nothing archived for ${shortDateKeyLabel(dateKey)}` : 'No events yet'}
      </Text>
      <SegmentedText variant="caption" style={styles.centered}>
        Our historians haven’t unlocked this day yet — new events arrive every day.
      </SegmentedText>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  glyph: {
    fontSize: 48,
  },
  centered: {
    textAlign: 'center',
  },
});
