import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StreakFlame } from '@/components/gamification/StreakFlame';
import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useIsPro } from '@/stores/useEntitlementStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { selectTodayCompleted, useProgressionStore } from '@/stores/useProgressionStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { hasAuthoredQuiz } from '@/data/quizGeneration';

/**
 * The terminal feed card: swipe past today's last event and land here.
 * Seamless TikTok-style continuation into the Butterfly Effect quiz — no
 * mode switch, just one more card. Flips to a "secured" state once today's
 * quiz is done.
 */
export const QuizGateCard = memo(function QuizGateCard() {
  const router = useRouter();
  const todayCompleted = useProgressionStore(selectTodayCompleted);
  const isPro = useIsPro();
  // Most days are drilled from the archive rather than authored as scenarios.
  // Promising "three decisions" on a day of recall questions would be a lie the
  // very next screen exposes.
  const authored = useFeedStore((s) => s.deck.some(hasAuthoredQuiz));

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={[palette.void, palette.ink, '#1A1430']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <Text style={styles.glyph}>{todayCompleted ? '🛡️' : authored ? '🦋' : '🧠'}</Text>
        <SegmentedText variant="label" style={styles.kicker}>
          {todayCompleted ? 'Intel secured' : authored ? 'The Butterfly Effect' : 'Recall check'}
        </SegmentedText>
        <Text style={styles.headline}>
          {todayCompleted
            ? 'Today’s simulation is complete'
            : authored
              ? 'Three decisions shaped today.\nWould you have made them?'
              : 'Three questions on today.\nHow much of it stuck?'}
        </Text>

        {todayCompleted ? (
          <View style={styles.completedBlock}>
            <StreakFlame />
            {isPro ? (
              <PressableScale
                onPress={() => router.push('/quiz?practice=1')}
                style={styles.practiceButton}
                accessibilityLabel="Practice today's scenarios again"
              >
                <SegmentedText variant="label" style={styles.practiceLabel}>
                  Practice again
                </SegmentedText>
              </PressableScale>
            ) : (
              <PressableScale
                onPress={() => router.push('/paywall')}
                style={styles.lockChip}
                accessibilityLabel="Unlock unlimited practice with Pro"
              >
                <Text style={styles.lockGlyph}>✦</Text>
                <SegmentedText variant="label" style={styles.lockLabel}>
                  Practice unlimited with Pro
                </SegmentedText>
              </PressableScale>
            )}
            <SegmentedText variant="caption">New scenarios arrive tomorrow</SegmentedText>
          </View>
        ) : (
          <PressableScale
            onPress={() => router.push('/quiz')}
            style={styles.beginButton}
            accessibilityLabel="Begin today's three-scenario quiz"
          >
            <SegmentedText variant="label" style={styles.beginLabel}>
              Begin simulation
            </SegmentedText>
          </PressableScale>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.lg,
  },
  glyph: {
    fontSize: 56,
  },
  kicker: {
    color: palette.accent,
  },
  headline: {
    ...type.headline,
    textAlign: 'center',
  },
  completedBlock: {
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  beginButton: {
    marginTop: spacing.md,
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg - 2,
  },
  beginLabel: {
    color: palette.void,
  },
  practiceButton: {
    backgroundColor: palette.inkRaised,
    borderWidth: 1,
    borderColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  practiceLabel: {
    color: palette.accent,
  },
  lockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.accentDim,
    borderWidth: 1,
    borderColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  lockGlyph: {
    color: palette.accent,
    fontSize: 12,
  },
  lockLabel: {
    color: palette.accent,
  },
});
