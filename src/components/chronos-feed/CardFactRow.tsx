import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { spacing } from '@/theme/tokens';

/** The atomic Blinkist unit: one icon, one sentence. Never more. */
interface CardFactRowProps {
  icon: string;
  text: string;
}

export const CardFactRow = memo(function CardFactRow({ icon, text }: CardFactRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.textWrap}>
        <SegmentedText variant="fact">{text}</SegmentedText>
      </View>
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
    lineHeight: 21,
  },
  textWrap: {
    flex: 1,
  },
});
