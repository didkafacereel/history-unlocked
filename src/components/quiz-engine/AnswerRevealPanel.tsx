import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useQuizStore } from '@/stores/useQuizStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * The Butterfly Effect moment: after answering, show what actually happened
 * and how it rippled forward. This panel is the pedagogical heart of the quiz.
 *
 * A generated recall question has no authored ripple to show, so its payoff is
 * the article's own account. Calling that "the Butterfly Effect" would promise
 * a consequence the text does not contain — so the heading changes with the
 * question, and so does the verdict line: getting a date wrong is a memory
 * lapse, not a decision history overruled.
 */
interface AnswerRevealPanelProps {
  isCorrect: boolean;
  butterflyEffect: string;
  isLastQuestion: boolean;
  /** True for a recall question built from the manifest rather than authored. */
  generated?: boolean;
}

export const AnswerRevealPanel = memo(function AnswerRevealPanel({
  isCorrect,
  butterflyEffect,
  isLastQuestion,
  generated = false,
}: AnswerRevealPanelProps) {
  const advance = useQuizStore((s) => s.advance);

  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.panel}>
      <SegmentedText variant="label" style={isCorrect ? styles.verdictGood : styles.verdictBad}>
        {isCorrect
          ? generated
            ? '✓ Remembered'
            : '✓ Correct call'
          : generated
            ? '✗ Not quite'
            : '✗ History went another way'}
      </SegmentedText>
      <View style={styles.effectBlock}>
        <SegmentedText variant="label">
          {generated ? 'What happened' : 'The Butterfly Effect'}
        </SegmentedText>
        <Text style={styles.effectText}>{butterflyEffect}</Text>
      </View>
      <PressableScale
        onPress={advance}
        style={styles.continueButton}
        accessibilityLabel={isLastQuestion ? 'See your results' : 'Next question'}
      >
        <SegmentedText variant="label" style={styles.continueLabel}>
          {isLastQuestion ? 'Debrief →' : generated ? 'Next →' : 'Next scenario →'}
        </SegmentedText>
      </PressableScale>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  panel: {
    gap: spacing.lg,
  },
  verdictGood: {
    color: palette.correct,
  },
  verdictBad: {
    color: palette.incorrect,
  },
  effectBlock: {
    backgroundColor: palette.inkRaised,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: palette.accent,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  effectText: {
    ...type.fact,
    color: palette.textPrimary,
  },
  continueButton: {
    alignSelf: 'flex-start',
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  continueLabel: {
    color: palette.void,
  },
});
