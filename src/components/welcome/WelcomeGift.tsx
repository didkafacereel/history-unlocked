import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { monthLabel } from '@/lib/dateKey';
import { formatCount } from '@/lib/formatCount';
import { WELCOME_CAP, WELCOME_DAYS } from '@/services/welcome';
import { useWelcomeStore } from '@/stores/useWelcomeStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * "Welcome, time traveller" — the launch gift, announced.
 *
 * Shown once, the moment the server grants the week, over whatever screen the
 * reader signed in from. The user asked for a greeting with some fun in it, and
 * the joke carries the facts rather than replacing them: what they got, for how
 * long, when it ends, and that nothing is charged when it does. A gift that
 * leaves the reader wondering whether they signed up for a subscription is not
 * a gift.
 *
 * Every Pro claim here is one of the features in `src/config/pro.ts`.
 */
function endDate(endsAt: number): string {
  const d = new Date(endsAt);
  return `${d.getDate()} ${monthLabel(d.getMonth() + 1)}`;
}

export const WelcomeGift = memo(function WelcomeGift() {
  const insets = useSafeAreaInsets();
  const grant = useWelcomeStore((s) => s.grant);
  const unseen = useWelcomeStore((s) => s.unseen);
  const markSeen = useWelcomeStore((s) => s.markSeen);

  // `number: 0` is store review access (see the server's `claimReviewer`), not
  // one of the 5,000 — the week and the reader number would both be untrue.
  if (!unseen || !grant || grant.number === 0) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(260)}
      style={[styles.backdrop, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}
      accessibilityViewIsModal
    >
      <View style={styles.glow} pointerEvents="none" />

      <Animated.View entering={FadeInDown.duration(420).delay(120)} style={styles.head}>
        <SegmentedText variant="label" style={styles.kicker}>
          ✦ A gift from history ✦
        </SegmentedText>
        <Text style={styles.title}>Welcome, time traveller.</Text>
        <Text style={styles.lead}>History’s buying the first round.</Text>
      </Animated.View>

      <Animated.View entering={ZoomIn.duration(520).delay(360)} style={styles.ticket}>
        <Text style={styles.ticketDays}>{`${WELCOME_DAYS} DAYS`}</Text>
        <Text style={styles.ticketPro}>OF PRO · ON THE HOUSE</Text>
        <View style={styles.ticketRule} />
        <Text style={styles.ticketNumber}>
          {`Reader #${formatCount(grant.number)} of the first ${formatCount(WELCOME_CAP)}`}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(420).delay(700)} style={styles.body}>
        <Text style={styles.bodyText}>
          Every event on every date, the whole Time Machine, recall drills and six thousand
          scenarios — yours for a week.
        </Text>
        <Text style={styles.fine}>
          {`No card. Nothing to cancel. On ${endDate(grant.endsAt)} it quietly goes back to free — and everything you’ve read stays yours.`}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(420).delay(950)}>
        <PressableScale onPress={markSeen} style={styles.cta} accessibilityLabel="Start exploring">
          <Text style={styles.ctaLabel}>Let’s go back in time →</Text>
        </PressableScale>
      </Animated.View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    backgroundColor: palette.void,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  glow: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 260,
    backgroundColor: palette.accentDim,
    opacity: 0.9,
  },
  head: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  kicker: {
    color: palette.accent,
  },
  title: {
    ...type.headline,
    fontSize: 32,
    lineHeight: 38,
    textAlign: 'center',
  },
  lead: {
    ...type.fact,
    fontSize: 18,
    color: palette.textSecondary,
    textAlign: 'center',
  },
  ticket: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.accent,
    borderStyle: 'dashed',
    backgroundColor: palette.inkRaised,
    gap: spacing.xs,
  },
  ticketDays: {
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '800',
    letterSpacing: -1,
    color: palette.accent,
    textShadowColor: palette.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  ticketPro: {
    ...type.label,
    fontSize: 14,
    letterSpacing: 2,
    color: palette.textPrimary,
  },
  ticketRule: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.glassBorder,
    marginVertical: spacing.sm,
  },
  ticketNumber: {
    ...type.caption,
    color: palette.textSecondary,
  },
  body: {
    gap: spacing.md,
    alignItems: 'center',
  },
  bodyText: {
    ...type.fact,
    color: palette.textPrimary,
    textAlign: 'center',
  },
  fine: {
    ...type.caption,
    color: palette.textTertiary,
    textAlign: 'center',
  },
  cta: {
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl + spacing.sm,
    paddingVertical: spacing.md + 2,
  },
  ctaLabel: {
    ...type.label,
    fontSize: 15,
    color: palette.void,
    textTransform: 'none',
    letterSpacing: 0.4,
  },
});
