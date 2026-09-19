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

  /*
   * The insignia alone, no name — and this variant exists only for the feed's
   * top chip.
   *
   * With the name it measured about 280 of a 375dp phone's width once the
   * streak sat beside it, which left the date and filter chips no room: they
   * first overlapped it, then overflowed the screen. "GRANDMASTER" would be
   * wider still. The rank is progression flavour, not navigation; the streak
   * beside it is the habit signal and is short. Tapping the chip opens the
   * profile, where the rank is shown full size with its XP, and the chip's
   * accessibility label already reads both aloud.
   */
  if (size === 'compact') {
    return <Text style={styles.compactGlyph}>{rank.glyph}</Text>;
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
  compactGlyph: {
    fontSize: 13,
    color: palette.accent,
  },
});
