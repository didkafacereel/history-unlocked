import { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useProgressionStore } from '@/stores/useProgressionStore';
import { palette, spacing } from '@/theme/tokens';

/**
 * The streak flame. Subscribes ONLY to streakCount. A live streak breathes
 * (gentle scale loop); a dead streak sits dim and still.
 */
interface StreakFlameProps {
  size?: 'compact' | 'display';
}

export const StreakFlame = memo(function StreakFlame({ size = 'display' }: StreakFlameProps) {
  const streakCount = useProgressionStore((s) => s.streakCount);
  const alive = streakCount > 0;

  return (
    <View style={[styles.row, size === 'compact' && styles.rowCompact]}>
      <FlamePulse alive={alive} fontSize={size === 'display' ? 34 : 16} />
      <View>
        <Text
          style={[
            size === 'display' ? styles.countDisplay : styles.countCompact,
            !alive && styles.dim,
          ]}
        >
          {streakCount}
        </Text>
        {size === 'display' && (
          <SegmentedText variant="label">{streakCount === 1 ? 'day streak' : 'days streak'}</SegmentedText>
        )}
      </View>
    </View>
  );
});

function FlamePulse({ alive, fontSize }: { alive: boolean; fontSize: number }) {
  const breath = useSharedValue(1);

  useEffect(() => {
    if (alive) {
      breath.value = withRepeat(
        withSequence(
          withTiming(1.12, { duration: 620, easing: Easing.inOut(Easing.quad) }),
          withTiming(1, { duration: 620, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      );
    }
    // Dead streak: no loop is started, the flame just sits at rest.
  }, [alive, breath]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Text style={[{ fontSize }, !alive && styles.dim]}>🔥</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowCompact: {
    gap: spacing.xs,
  },
  countDisplay: {
    fontSize: 30,
    fontWeight: '800',
    color: palette.streakFlame,
    lineHeight: 34,
  },
  countCompact: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.streakFlame,
    lineHeight: 18,
  },
  dim: {
    opacity: 0.4,
  },
});
