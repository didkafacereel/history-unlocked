import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { useQuizStore } from '@/stores/useQuizStore';
import { swipeSpring } from '@/theme/motion';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * 3-dot quiz position. Subscribes ONLY to questionIndex and question count —
 * answering (phase changes) does not re-render this component.
 */
export const QuizProgressDots = memo(function QuizProgressDots() {
  const total = useQuizStore((s) => s.items.length);
  const questionIndex = useQuizStore((s) => s.questionIndex);

  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => (
        <Dot key={i} state={i < questionIndex ? 'done' : i === questionIndex ? 'active' : 'ahead'} />
      ))}
    </View>
  );
});

function Dot({ state }: { state: 'done' | 'active' | 'ahead' }) {
  const animatedStyle = useAnimatedStyle(
    () => ({
      width: withSpring(state === 'active' ? 26 : 8, swipeSpring),
      opacity: withSpring(state === 'ahead' ? 0.35 : 1, swipeSpring),
    }),
    [state],
  );

  return (
    <Animated.View
      style={[styles.dot, state === 'done' ? styles.dotDone : styles.dotDefault, animatedStyle]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: radius.pill,
  },
  dotDefault: {
    backgroundColor: palette.accent,
  },
  dotDone: {
    backgroundColor: palette.correct,
  },
});
