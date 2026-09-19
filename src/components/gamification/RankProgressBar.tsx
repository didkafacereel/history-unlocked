import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useProgressionStore } from '@/stores/useProgressionStore';
import { swipeSpring } from '@/theme/motion';
import { palette, radius, spacing } from '@/theme/tokens';
import { nextRankFor, rankProgress } from '@/types/progression';

/**
 * XP toward the next Intel Rank. The fill springs to its new width on each
 * xp change — a JS-prop-driven animation, far from any gesture hot path.
 */
export const RankProgressBar = memo(function RankProgressBar() {
  const xp = useProgressionStore((s) => s.xp);
  const next = nextRankFor(xp);
  const progress = rankProgress(xp);

  const fillStyle = useAnimatedStyle(
    () => ({
      width: withSpring(`${Math.round(progress * 100)}%`, swipeSpring),
    }),
    [progress],
  );

  return (
    <View style={styles.block}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      <SegmentedText variant="caption">
        {next ? `${next.minXp - xp} XP to ${next.name} ${next.glyph}` : 'Top of the ladder — Grandmaster'}
      </SegmentedText>
    </View>
  );
});

const styles = StyleSheet.create({
  block: {
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: palette.inkRaised,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
  },
});
