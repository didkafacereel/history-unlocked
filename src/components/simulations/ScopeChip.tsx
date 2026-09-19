import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { formatCount } from '@/lib/formatCount';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * One choice on the simulation picker.
 *
 * The count is not decoration. A reader picking "Ancient" needs to know it
 * holds 75 events and "Modern" holds five thousand before they commit to a
 * run — otherwise a narrow scope silently repeats itself and reads as the app
 * having run out, which is the exact impression the whole feature exists to
 * remove. A scope with too little in it is shown disabled rather than hidden,
 * so the archive's real shape stays visible.
 */
interface ScopeChipProps {
  label: string;
  count: number;
  /** Below this a run would be mostly repeats. */
  minimum: number;
  onPress: () => void;
}

export const ScopeChip = memo(function ScopeChip({
  label,
  count,
  minimum,
  onPress,
}: ScopeChipProps) {
  const enough = count >= minimum;

  return (
    <PressableScale
      onPress={enough ? onPress : () => {}}
      style={enough ? styles.chip : { ...styles.chip, ...styles.chipThin }}
      accessibilityLabel={
        enough ? `${label}, ${count} events` : `${label}, only ${count} events — too few to run`
      }
    >
      <View style={styles.row}>
        <Text style={enough ? styles.label : { ...styles.label, ...styles.labelThin }}>
          {label}
        </Text>
        <Text style={styles.count}>{formatCount(count)}</Text>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  chip: {
    backgroundColor: palette.inkRaised,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  chipThin: {
    opacity: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: {
    ...type.fact,
    color: palette.textPrimary,
    flexShrink: 1,
  },
  labelThin: {
    color: palette.textSecondary,
  },
  count: {
    ...type.caption,
    color: palette.accent,
    fontVariant: ['tabular-nums'],
  },
});
