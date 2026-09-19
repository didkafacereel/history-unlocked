import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { pressSpring } from '@/theme/motion';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * One answer option. The verdict color morph runs in useAnimatedStyle keyed
 * on the `verdict` prop — declarative, no effects, satisfyingly snappy.
 */
export type ChoiceVerdict = 'idle' | 'correct' | 'wrong' | 'dimmed';

const SURFACE: Record<ChoiceVerdict, string> = {
  idle: palette.inkRaised,
  correct: 'rgba(61, 220, 132, 0.18)',
  wrong: 'rgba(255, 84, 112, 0.18)',
  dimmed: palette.inkRaised,
};

const EDGE: Record<ChoiceVerdict, string> = {
  idle: palette.glassBorder,
  correct: palette.correct,
  wrong: palette.incorrect,
  dimmed: palette.glassBorder,
};

interface ChoiceButtonProps {
  text: string;
  verdict: ChoiceVerdict;
  disabled: boolean;
  onPress: () => void;
}

export const ChoiceButton = memo(function ChoiceButton({
  text,
  verdict,
  disabled,
  onPress,
}: ChoiceButtonProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(
    () => ({
      backgroundColor: withTiming(SURFACE[verdict], { duration: 220 }),
      borderColor: withTiming(EDGE[verdict], { duration: 220 }),
      opacity: withTiming(verdict === 'dimmed' ? 0.45 : 1, { duration: 220 }),
      transform: [
        {
          scale: withSpring(
            verdict === 'correct' ? 1.02 : pressed.value === 1 ? 0.97 : 1,
            pressSpring,
          ),
        },
      ],
    }),
    [verdict],
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      accessibilityRole="button"
      accessibilityLabel={text}
    >
      <Animated.View style={[styles.choice, animatedStyle]}>
        <Text style={styles.text}>{text}</Text>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  choice: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg - 2,
  },
  text: {
    ...type.fact,
    color: palette.textPrimary,
  },
});
