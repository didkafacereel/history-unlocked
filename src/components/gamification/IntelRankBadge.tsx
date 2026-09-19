import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useProgressionStore } from '@/stores/useProgressionStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { rankForXp } from '@/types/progression';

/** Current Intel Rank insignia. Subscribes only to xp; rank is derived. */
interface IntelRankBadgeProps {
  size?: 'compact' | 'display';
}

export const IntelRankBadge = memo(function IntelRankBadge({
  size = 'display',
}: IntelRankBadgeProps) {
  const xp = useProgressionStore((s) => s.xp);
  const rank = rankForXp(xp);

  if (size === 'compact') {
    return (
      <View style={styles.compactRow}>
        <Text style={styles.compactGlyph}>{rank.glyph}</Text>
        <SegmentedText variant="label" style={styles.compactName}>
          {rank.name}
        </SegmentedText>
      </View>
    );
  }

  return (
    <View style={styles.display}>
      <View style={styles.insignia}>
        <Text style={styles.glyph}>{rank.glyph}</Text>
      </View>
      <SegmentedText variant="headline">{rank.name}</SegmentedText>
      <SegmentedText variant="caption">{`${xp} XP earned`}</SegmentedText>
    </View>
  );
});

const INSIGNIA = 84;

const styles = StyleSheet.create({
  display: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  insignia: {
    width: INSIGNIA,
    height: INSIGNIA,
    borderRadius: radius.pill,
    backgroundColor: palette.accentDim,
    borderWidth: 1,
    borderColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    fontSize: 36,
    color: palette.accent,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  compactGlyph: {
    fontSize: 12,
    color: palette.accent,
  },
  compactName: {
    color: palette.textSecondary,
  },
});
