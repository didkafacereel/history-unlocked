import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { QuizEngine } from '@/components/quiz-engine/QuizEngine';
import { attachQuizPools, loadEventsByIds } from '@/data/ingestion';
import { goBack } from '@/lib/goBack';
import { useEntitlementStore } from '@/stores/useEntitlementStore';
import { useQuizStore } from '@/stores/useQuizStore';
import { selectDueEventIds, useRecallStore } from '@/stores/useRecallStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * The recall drill — a Pro review session over whatever the spaced-repetition
 * schedule says has come due, drawn from the whole archive rather than today.
 *
 * Always score-only: the drill must never become a second route to today's XP
 * and streak, or the daily quiz stops meaning anything.
 */
const DRILL_MAX = 10;

export default function RecallRoute() {
  const router = useRouter();
  const isPro = useEntitlementStore((s) => s.isPro);
  const beginRecallDrill = useQuizStore((s) => s.beginRecallDrill);
  const phase = useQuizStore((s) => s.phase);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPro) {
      router.replace('/paywall');
    }
  }, [isPro, router]);

  useEffect(() => {
    let active = true;
    const dueIds = selectDueEventIds(useRecallStore.getState()).slice(0, DRILL_MAX);

    // attachQuizPools before the drill begins: the authored questions ship in
    // their own file, and a recall drill is exactly where they are wanted.
    void loadEventsByIds(dueIds)
      .then(attachQuizPools)
      .then((events) => {
        if (!active) {
          return;
        }
        beginRecallDrill(events);
        setLoading(false);
      });

    return () => {
      active = false;
      useQuizStore.getState().reset();
    };
  }, [beginRecallDrill]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  if (phase === 'idle') {
    return (
      <View style={styles.centered}>
        <Text style={styles.glyph}>🧠</Text>
        <Text style={type.headline}>Nothing due</Text>
        <SegmentedText variant="caption" style={styles.body}>
          Everything you’ve answered is still fresh — each one returns just
          before you would have forgotten it.
        </SegmentedText>
        <PressableScale
          onPress={() => goBack(router)}
          style={styles.button}
          accessibilityLabel="Back"
        >
          <SegmentedText variant="label" style={styles.buttonLabel}>
            Back
          </SegmentedText>
        </PressableScale>
      </View>
    );
  }

  return <QuizEngine />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  glyph: {
    fontSize: 48,
  },
  body: {
    textAlign: 'center',
    maxWidth: 300,
  },
  button: {
    marginTop: spacing.md,
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  buttonLabel: {
    color: palette.void,
  },
});
