import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFeedStore } from '@/stores/useFeedStore';
import { swipeSpring } from '@/theme/motion';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * Vertical position dots on the right edge. Subscribes ONLY to activeIndex
 * and deck length — a card settle re-renders this rail and nothing else.
 * The dot animation runs off a JS prop change (once per settle), which is
 * outside the gesture hot path by design.
 */
export const CardProgressRail = memo(function CardProgressRail() {
  const total = useFeedStore((s) => s.deck.length);
  const activeIndex = useFeedStore((s) => s.activeIndex);
  const insets = useSafeAreaInsets();

  if (total < 2) {
    return null;
  }

  return (
    <View style={[styles.rail, { top: insets.top + spacing.xl }]} pointerEvents="none">
      {Array.from({ length: total }, (_, i) => (
        <RailDot key={i} isActive={i === activeIndex} />
      ))}
    </View>
  );
});

const RailDot = memo(function RailDot({ isActive }: { isActive: boolean }) {
  const animatedStyle = useAnimatedStyle(() => ({
    height: withSpring(isActive ? 22 : 6, swipeSpring),
    opacity: withSpring(isActive ? 1 : 0.45, swipeSpring),
  }));

  return (
    <Animated.View
      style={[styles.dot, isActive && styles.dotActive, animatedStyle]}
    />
  );
});

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    right: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 4,
    borderRadius: radius.pill,
    backgroundColor: palette.textTertiary,
  },
  dotActive: {
    backgroundColor: palette.accent,
  },
});
