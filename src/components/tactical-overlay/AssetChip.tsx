import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { palette, radius, spacing } from '@/theme/tokens';

/** One piece of hardware: name, quantity, owning faction. */
interface AssetChipProps {
  name: string;
  quantity: string;
  faction: string;
}

export const AssetChip = memo(function AssetChip({ name, quantity, faction }: AssetChipProps) {
  return (
    <View style={styles.chip}>
      <View style={styles.titleRow}>
        <SegmentedText variant="fact" style={styles.name}>
          {name}
        </SegmentedText>
        <SegmentedText variant="label" style={styles.quantity}>
          {quantity}
        </SegmentedText>
      </View>
      <SegmentedText variant="caption">{faction}</SegmentedText>
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {
    backgroundColor: palette.inkRaised,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.xs / 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  name: {
    color: palette.textPrimary,
    flexShrink: 1,
  },
  quantity: {
    color: palette.accent,
  },
});
