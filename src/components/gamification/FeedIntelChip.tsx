import { useRouter } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { palette, radius, spacing } from '@/theme/tokens';

import { IntelRankBadge } from './IntelRankBadge';
import { StreakFlame } from './StreakFlame';

/**
 * Always-on progression chip in the feed's top-left corner: streak + rank,
 * tap → Intel Rank screen. Composed of compact variants that each subscribe
 * to their own single store field.
 */
export const FeedIntelChip = memo(function FeedIntelChip() {
  const router = useRouter();

  return (
    <View>
      <PressableScale
        onPress={() => router.push('/profile')}
        style={styles.chip}
        accessibilityLabel="Open your intel rank and streak"
      >
        <StreakFlame size="compact" />
        <View style={styles.divider} />
        <IntelRankBadge size="compact" />
      </PressableScale>
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.glass,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 14,
    backgroundColor: palette.glassBorder,
  },
});
