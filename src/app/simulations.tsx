import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { QuizEngine } from '@/components/quiz-engine/QuizEngine';
import { ScopePicker } from '@/components/simulations/ScopePicker';
import { scopeLabel } from '@/data/simulationPlan';
import { useEntitlementStore } from '@/stores/useEntitlementStore';
import { useQuizStore } from '@/stores/useQuizStore';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { palette, spacing } from '@/theme/tokens';

/**
 * Endless practice over any slice of the archive.
 *
 * The reason it exists: the archive holds six thousand written scenarios and
 * the daily quiz serves three a day. At that rate a reader would need five
 * years to see what is already in the manifest — the most expensive thing the
 * project owns was also its least reachable.
 *
 * Two states, one route: the picker until a scope is chosen, then the engine.
 * A separate route for the picker would leave a dead screen in the back stack
 * between every round.
 */
export default function SimulationsRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isPro = useEntitlementStore((s) => s.isPro);
  const scope = useSimulationStore((s) => s.scope);
  const loading = useSimulationStore((s) => s.loading);
  const start = useSimulationStore((s) => s.start);
  const phase = useQuizStore((s) => s.phase);

  useEffect(() => {
    if (!isPro) {
      router.replace('/paywall');
    }
  }, [isPro, router]);

  // Leaving the screen ends the sitting. Without this, coming back lands
  // mid-round in a quiz the reader has no memory of starting.
  useEffect(() => {
    return () => {
      useSimulationStore.getState().clear();
    };
  }, []);

  if (!scope) {
    return (
      <View style={[styles.screen, insetStyle(insets.top, insets.bottom)]}>
        <ScopePicker
          onPick={(picked) => {
            void start(picked);
          }}
        />
      </View>
    );
  }

  if (loading || phase === 'idle') {
    return (
      <View style={[styles.screen, styles.centered, insetStyle(insets.top, insets.bottom)]}>
        <ActivityIndicator color={palette.accent} />
        <SegmentedText variant="caption">{scopeLabel(scope)}</SegmentedText>
        <PressableScale
          onPress={() => useSimulationStore.getState().clear()}
          accessibilityLabel="Choose a different scope"
        >
          <SegmentedText variant="caption" style={styles.link}>
            Choose something else
          </SegmentedText>
        </PressableScale>
      </View>
    );
  }

  return <QuizEngine />;
}

function insetStyle(top: number, bottom: number) {
  return { paddingTop: top + spacing.xl, paddingBottom: bottom + spacing.lg };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.ink,
    paddingHorizontal: spacing.xl,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  link: {
    color: palette.accent,
  },
});
