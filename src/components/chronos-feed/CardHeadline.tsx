import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { spacing } from '@/theme/tokens';

/** Year numeral + event title — the card's visual anchor. */
interface CardHeadlineProps {
  year: number;
  title: string;
  /** The day's lead sets its title a step larger. */
  hero?: boolean;
}

export const CardHeadline = memo(function CardHeadline({
  year,
  title,
  hero = false,
}: CardHeadlineProps) {
  return (
    <View style={styles.block}>
      <SegmentedText variant="yearDisplay">{String(Math.abs(year))}</SegmentedText>
      <SegmentedText variant={hero ? 'heroHeadline' : 'headline'}>{title}</SegmentedText>
    </View>
  );
});

const styles = StyleSheet.create({
  block: {
    gap: spacing.xs,
  },
});
