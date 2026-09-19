import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * A fact in the reader. Unlike the feed's `CardFactRow`, nothing is clipped —
 * the whole point of this screen is that the reader wanted the full sentence.
 */
export const DetailFactRow = memo(function DetailFactRow({
  icon,
  text,
}: {
  icon: string;
  text: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  icon: {
    fontSize: 16,
    lineHeight: 24,
  },
  text: {
    ...type.fact,
    flex: 1,
    lineHeight: 24,
    color: palette.textPrimary,
  },
});
