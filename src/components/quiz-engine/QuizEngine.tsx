import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { imageWouldRevealAnswer, isGeneratedQuestion } from '@/data/quizGeneration';
import { useQuizStore } from '@/stores/useQuizStore';
import { palette, spacing } from '@/theme/tokens';

import { AnswerRevealPanel } from './AnswerRevealPanel';
import { ChoiceGrid } from './ChoiceGrid';
import { QuizEventImage } from './QuizEventImage';
import { QuizProgressDots } from './QuizProgressDots';
import { QuizSummaryCard } from './QuizSummaryCard';
import { ScenarioPrompt } from './ScenarioPrompt';

/**
 * Butterfly Effect Engine host. Pure phase router — each phase's UI is its
 * own micro-component with its own narrow store subscription; this file
 * decides only WHAT is on stage, never how it looks or animates.
 *
 * The question phase scrolls. It has to: an authored scenario runs to 320
 * characters, four choices can each run to a full line, and the reveal adds a
 * 600-character account underneath — on a small phone that overflowed a fixed
 * column before the picture was ever added, silently clipping the Next button.
 */
export function QuizEngine() {
  const phase = useQuizStore((s) => s.phase);
  const items = useQuizStore((s) => s.items);
  const questionIndex = useQuizStore((s) => s.questionIndex);
  const answers = useQuizStore((s) => s.answers);
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);

  const revealed = phase === 'reveal';

  // The verdict and the Next button arrive below the fold on a small screen, so
  // the reader is taken to them. Without this the quiz looks like it did not
  // respond to the tap.
  useEffect(() => {
    if (revealed) {
      scroller.current?.scrollToEnd({ animated: true });
    }
  }, [revealed]);

  // A new question starts at the top, whatever the last one scrolled to.
  useEffect(() => {
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, [questionIndex]);

  if (phase === 'summary') {
    return (
      <View style={[styles.screen, screenInsets(insets.top, insets.bottom)]}>
        <QuizSummaryCard />
      </View>
    );
  }

  const item = items[questionIndex];
  if (!item) {
    return null; // 'idle' with no draw — the route renders its empty state
  }

  const { question, image } = item;
  const answer = answers.find((a) => a.questionId === question.id);
  const showImage = image && (revealed || !imageWouldRevealAnswer(question));

  return (
    <ScrollView
      ref={scroller}
      style={styles.scroller}
      contentContainerStyle={[styles.screen, screenInsets(insets.top, insets.bottom)]}
      showsVerticalScrollIndicator={false}
    >
      <QuizProgressDots />
      {showImage ? <QuizEventImage image={image} /> : null}
      <ScenarioPrompt
        scenario={question.scenario}
        prompt={question.prompt}
        generated={isGeneratedQuestion(question)}
      />
      <ChoiceGrid question={question} revealed={revealed} />
      {revealed && answer && (
        <AnswerRevealPanel
          isCorrect={answer.isCorrect}
          butterflyEffect={question.butterflyEffect}
          isLastQuestion={questionIndex === items.length - 1}
          generated={isGeneratedQuestion(question)}
        />
      )}
    </ScrollView>
  );
}

function screenInsets(top: number, bottom: number) {
  return { paddingTop: top + spacing.xl, paddingBottom: bottom + spacing.xl };
}

const styles = StyleSheet.create({
  scroller: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  screen: {
    flexGrow: 1,
    backgroundColor: palette.ink,
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
});
