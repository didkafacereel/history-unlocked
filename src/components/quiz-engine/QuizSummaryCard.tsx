import { useRouter } from 'expo-router';
import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CelebrationBurst } from '@/components/gamification/CelebrationBurst';
import { RankProgressBar } from '@/components/gamification/RankProgressBar';
import { StreakFlame } from '@/components/gamification/StreakFlame';
import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { shouldOfferReminder } from '@/lib/reminderOffer';
import { dailyReminders } from '@/services/notifications';
import { useIsPro } from '@/stores/useEntitlementStore';
import { useQuizStore } from '@/stores/useQuizStore';
import { useReminderStore } from '@/stores/useReminderStore';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

import { QuizUpsellPanel } from './QuizUpsellPanel';
import { ReminderAskPanel } from './ReminderAskPanel';

/**
 * Debrief: accuracy → XP → rank progress → streak, in that visual order —
 * the handoff from today's performance to long-term progression. XP and
 * streak were already committed by the store on entering `summary`.
 */
export const QuizSummaryCard = memo(function QuizSummaryCard() {
  const router = useRouter();
  const answers = useQuizStore((s) => s.answers);
  const total = useQuizStore((s) => s.items.length);
  const xpEarned = useQuizStore((s) => s.xpEarned);
  const practice = useQuizStore((s) => s.practice);
  const solemn = useQuizStore((s) => s.solemn);
  const simulation = useQuizStore((s) => s.mode === 'simulation');
  const round = useSimulationStore((s) => s.round);
  const isPro = useIsPro();

  const correct = answers.filter((a) => a.isCorrect).length;
  const perfect = total > 0 && correct === total;

  /**
   * Decided ONCE, when the debrief mounts. Answering the ask marks it offered,
   * and a condition read live would unmount the panel mid-answer and slide the
   * upsell into its place — the reader would tap "Remind me" and watch it turn
   * into an advertisement.
   */
  const [askReminder] = useState(() => {
    const reminder = useReminderStore.getState();
    return shouldOfferReminder({
      supported: dailyReminders.supported,
      enabled: reminder.enabled,
      offered: reminder.offered,
      practice,
      simulation,
    });
  });
  // The ask takes the upsell's place rather than stacking beside it: one
  // request per debrief. It only ever happens once, so every later daily quiz
  // still carries the offer — and a habit is worth more than one impression.
  const showUpsell = !askReminder && !isPro && !practice && !simulation;

  return (
    <View style={styles.stage}>
      {/* A round that touched a massacre, a famine or a mass-casualty disaster
          gets its score and its XP — but not the confetti. */}
      {perfect && !solemn && <CelebrationBurst />}

      <Animated.View entering={FadeInDown.duration(320)} style={styles.scoreBlock}>
        <SegmentedText variant="label" style={styles.kicker}>
          {practice
            ? 'Practice debrief'
            : perfect && !solemn
              ? 'Flawless simulation'
              : 'Simulation debrief'}
        </SegmentedText>
        <Text style={styles.score}>{`${correct}/${total}`}</Text>
        <SegmentedText variant="caption">scenarios called correctly</SegmentedText>
      </Animated.View>

      {/* Practice replays are score-only — no XP, no progression handoff. The
          era tallies, which a simulation DOES move, are shown in the profile;
          repeating them here would bury the score under statistics. */}
      {practice ? (
        <Animated.View entering={FadeInDown.duration(320).delay(120)} style={styles.xpBlock}>
          <SegmentedText variant="caption">
            {simulation ? `Round ${round} — no XP or streak` : 'Practice round — no XP or streak'}
          </SegmentedText>
        </Animated.View>
      ) : (
        <>
          <Animated.View entering={FadeInDown.duration(320).delay(120)} style={styles.xpBlock}>
            <Text style={styles.xpText}>{`+${xpEarned} XP`}</Text>
            <RankProgressBar />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(320).delay(240)}>
            <StreakFlame />
          </Animated.View>
        </>
      )}

      {/* The offer, and only where there is something to offer: a free reader
          who has just finished the DAILY quiz. Never in practice or a
          simulation, which are Pro-only and whose reader has already bought
          it, and never to a Pro reader, who would be sold what they own. */}
      {askReminder ? (
        <Animated.View entering={FadeInDown.duration(320).delay(300)} style={styles.upsell}>
          <ReminderAskPanel />
        </Animated.View>
      ) : null}

      {showUpsell ? (
        <Animated.View entering={FadeInDown.duration(320).delay(300)} style={styles.upsell}>
          <QuizUpsellPanel />
        </Animated.View>
      ) : null}

      {/* A simulation is a sitting, not an errand — the primary action is one
          more round, and leaving is the quiet option beneath it. Every other
          mode ends by going back, because it had a reason to end. */}
      <Animated.View entering={FadeInDown.duration(320).delay(360)} style={styles.actions}>
        {simulation ? (
          <>
            <PressableScale
              onPress={() => useSimulationStore.getState().nextRound()}
              style={styles.doneButton}
              accessibilityLabel="Run another round"
            >
              <SegmentedText variant="label" style={styles.doneLabel}>
                Another round
              </SegmentedText>
            </PressableScale>
            <PressableScale
              onPress={() => useSimulationStore.getState().clear()}
              accessibilityLabel="Choose a different scope"
            >
              <SegmentedText variant="caption" style={styles.quietLink}>
                Pick a different era
              </SegmentedText>
            </PressableScale>
          </>
        ) : (
          <PressableScale
            onPress={() => router.dismissTo('/')}
            style={styles.doneButton}
            accessibilityLabel="Return to today's feed"
          >
            <SegmentedText variant="label" style={styles.doneLabel}>
              Return to the feed
            </SegmentedText>
          </PressableScale>
        )}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  scoreBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  kicker: {
    color: palette.accent,
  },
  score: {
    ...type.yearDisplay,
    fontSize: 64,
    lineHeight: 70,
  },
  xpBlock: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.md,
  },
  xpText: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.correct,
  },
  doneButton: {
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg - 2,
  },
  doneLabel: {
    color: palette.void,
  },
  actions: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  upsell: {
    alignSelf: 'stretch',
  },
  quietLink: {
    color: palette.textSecondary,
  },
});
