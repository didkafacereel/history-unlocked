import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { QuizEngine } from '@/components/quiz-engine/QuizEngine';
import { goBack } from '@/lib/goBack';
import { useFeedStore } from '@/stores/useFeedStore';
import { useQuizStore } from '@/stores/useQuizStore';
import { palette, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { attachQuizPools } from '@/data/ingestion';

/** Route shell: draw today's three scenarios from the deck, run the engine. */
export default function QuizRoute() {
  const router = useRouter();
  const { practice } = useLocalSearchParams<{ practice?: string }>();
  const deck = useFeedStore((s) => s.deck);
  const beginDailyQuiz = useQuizStore((s) => s.beginDailyQuiz);
  const phase = useQuizStore((s) => s.phase);

  // The authored questions live in their own file so the feed never waits on
  // 2 MB it will not read; this is the moment they are actually needed. If the
  // fetch fails the events come back untouched and the engine falls through to
  // the generated questions, so the quiz always starts.
  useEffect(() => {
    let active = true;
    void attachQuizPools(deck).then((withPools) => {
      if (active) {
        beginDailyQuiz(withPools, practice === '1');
      }
    });
    return () => {
      active = false;
      useQuizStore.getState().reset();
    };
  }, [beginDailyQuiz, deck, practice]);

  if (phase === 'idle') {
    return (
      <View style={styles.empty}>
        <Text style={type.headline}>No scenarios today</Text>
        <SegmentedText variant="caption">
          This deck has no quiz pool yet — check back tomorrow.
        </SegmentedText>
        <PressableScale
          onPress={() => goBack(router)}
          style={styles.backButton}
          accessibilityLabel="Back to the feed"
        >
          <SegmentedText variant="label" style={styles.backLabel}>
            Back to the feed
          </SegmentedText>
        </PressableScale>
      </View>
    );
  }

  return <QuizEngine />;
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  backButton: {
    marginTop: spacing.md,
    backgroundColor: palette.accent,
    borderRadius: 999,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  backLabel: {
    color: palette.void,
  },
});
