import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useOnboardingStore, useShouldWelcome } from '@/stores/useOnboardingStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * The one thing shown before the app is used, once ever.
 *
 * Not a wizard. Three sentences over the real feed, which is already loaded and
 * visible behind the dim — the reader can see the thing being described while
 * it is described, and the card leaves in one tap. A carousel of illustrated
 * screens would delay the product to explain the product.
 *
 * It says the premise, not the controls. The upward chevron already teaches the
 * swipe; what a first-time reader cannot guess is that the feed is a DATE, that
 * it changes tomorrow, and that there is more underneath it than events.
 *
 * Rendered as a SIBLING of the deck, never inside it. That rule was learned the
 * expensive way when the category filter lived inside the gesture handler and
 * vanished the moment anyone touched it.
 */
export const WelcomeSheet = memo(function WelcomeSheet() {
  const show = useShouldWelcome();
  const dismiss = useOnboardingStore((s) => s.dismissWelcome);

  if (!show) {
    return null;
  }

  return (
    <Animated.View entering={FadeIn.duration(260)} style={styles.scrim}>
      <Animated.View entering={FadeInUp.duration(340)} style={styles.card}>
        <SegmentedText variant="label" style={styles.kicker}>
          ✦ History Unlocked
        </SegmentedText>
        <Text style={styles.title}>Today, but every year at once</Text>

        <View style={styles.lines}>
          <Line glyph="📅" text="This is what happened on today's date — across every century the archive holds." />
          <Line glyph="↑" text="Swipe up through the day, then the people born and lost on it." />
          <Line glyph="🦋" text="At the end, scenarios: decide what you would have done, then find out what happened." />
        </View>

        <SegmentedText variant="caption" style={styles.footnote}>
          Tomorrow it is a different date. Nothing to set up.
        </SegmentedText>

        <PressableScale
          onPress={dismiss}
          style={styles.cta}
          accessibilityLabel="Start reading"
        >
          <SegmentedText variant="label" style={styles.ctaLabel}>
            Start reading
          </SegmentedText>
        </PressableScale>
      </Animated.View>
    </Animated.View>
  );
});

const Line = memo(function Line({ glyph, text }: { glyph: string; text: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineGlyph}>{glyph}</Text>
      <Text style={styles.lineText}>{text}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(4, 6, 11, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  kicker: {
    color: palette.accent,
  },
  title: {
    ...type.headline,
  },
  lines: {
    gap: spacing.md,
  },
  line: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  lineGlyph: {
    fontSize: 16,
    lineHeight: 22,
    width: 22,
    textAlign: 'center',
  },
  lineText: {
    ...type.fact,
    color: palette.textSecondary,
    flex: 1,
  },
  footnote: {
    color: palette.textTertiary,
  },
  cta: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg - 2,
  },
  ctaLabel: {
    color: palette.void,
  },
});
