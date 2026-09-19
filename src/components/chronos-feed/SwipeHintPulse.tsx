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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFeedStore } from '@/stores/useFeedStore';
import { palette, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * First-launch affordance: a chevron drifting upward on loop. Subscribes only
 * to `hasSwiped` and unmounts forever after the first completed swipe.
 */
export const SwipeHintPulse = memo(function SwipeHintPulse() {
  const hasSwiped = useFeedStore((s) => s.hasSwiped);

  if (hasSwiped) {
    return null;
  }
  return <HintContent />;
});

function HintContent() {
  const drift = useSharedValue(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    drift.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 700, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 700, easing: Easing.in(Easing.quad) }),
      ),
      -1,
    );
  }, [drift]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drift.value }],
  }));

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + spacing.lg }]} pointerEvents="none">
      <Animated.View style={[styles.inner, animatedStyle]}>
        <Text style={styles.chevron}>︿</Text>
        <Text style={[type.label, styles.hintText]}>Swipe for next event</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  inner: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  chevron: {
    color: palette.textSecondary,
    fontSize: 18,
    lineHeight: 20,
  },
  hintText: {
    color: palette.textSecondary,
  },
});
