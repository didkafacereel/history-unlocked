import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useQuizStore } from '@/stores/useQuizStore';
import { spacing } from '@/theme/tokens';
import { ScenarioQuestion } from '@/types/manifest';

import { ChoiceButton, ChoiceVerdict } from './ChoiceButton';

/**
 * Answer options for the current question. Verdict mapping after an answer:
 * the correct choice lights green ALWAYS (teaching moment), the player's
 * wrong pick lights red, the rest dim out.
 */
interface ChoiceGridProps {
  question: ScenarioQuestion;
  revealed: boolean;
}

export const ChoiceGrid = memo(function ChoiceGrid({ question, revealed }: ChoiceGridProps) {
  const selectChoice = useQuizStore((s) => s.selectChoice);
  const answers = useQuizStore((s) => s.answers);
  const haptics = useHaptics();

  const answer = answers.find((a) => a.questionId === question.id);

  const verdictFor = (choiceId: string, isCorrect: boolean): ChoiceVerdict => {
    if (!revealed) {
      return 'idle';
    }
    if (isCorrect) {
      return 'correct';
    }
    if (answer?.choiceId === choiceId) {
      return 'wrong';
    }
    return 'dimmed';
  };

  const onPick = (choiceId: string, isCorrect: boolean) => {
    if (isCorrect) {
      haptics.correct();
    } else {
      haptics.incorrect();
    }
    selectChoice(choiceId);
  };

  return (
    <View style={styles.grid}>
      {question.choices.map((choice) => (
        <ChoiceButton
          key={choice.id}
          text={choice.text}
          verdict={verdictFor(choice.id, choice.isCorrect)}
          disabled={revealed}
          onPress={() => onPick(choice.id, choice.isCorrect)}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: {
    gap: spacing.md,
  },
});
