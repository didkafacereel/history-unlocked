import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { shortDateKeyLabel } from '@/lib/dateKey';
import { useFeedStore } from '@/stores/useFeedStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * The depth wall. A free reader swipes through their three events and lands
 * here, told exactly how many more the archive holds for this same day.
 *
 * Naming the number is the whole design: "unlock more history" is a slogan,
 * "9 more events from 10 Sep" is a fact the reader can check. It sits inside
 * the deck as a normal card rather than as a modal, so nothing is interrupted.
 */
export const DepthLockCard = memo(function DepthLockCard() {
  const router = useRouter();
  const lockedCount = useFeedStore((s) => s.lockedCount);
  const dateKey = useFeedStore((s) => s.dateKey);
  const shown = useFeedStore((s) => s.deck.length);

  const dayLabel = dateKey ? shortDateKeyLabel(dateKey) : 'this day';
  const total = shown + lockedCount;

  return (
    <View style={styles.card}>
      <LinearGradient colors={[palette.void, palette.ink, '#191228']} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <Text style={styles.glyph}>🗝️</Text>
        <SegmentedText variant="label" style={styles.kicker}>
          {`${lockedCount} more from ${dayLabel}`}
        </SegmentedText>
        <Text style={styles.headline}>
          {`You have read 3 of ${total} events\nrecorded on this day.`}
        </Text>
        <SegmentedText variant="caption" style={styles.body}>
          Pro opens every day in full — and remembers what you’ve read.
        </SegmentedText>

        <PressableScale
          onPress={() => router.push('/paywall')}
          style={styles.cta}
          accessibilityLabel={`Unlock the remaining ${lockedCount} events with Pro`}
        >
          <SegmentedText variant="label" style={styles.ctaLabel}>
            ✦ Open the full archive
          </SegmentedText>
        </PressableScale>

        <SegmentedText variant="caption" style={styles.footnote}>
          Swipe on for today’s simulation
        </SegmentedText>
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
    fontSize: 52,
  },
  kicker: {
    color: palette.accent,
  },
  headline: {
    ...type.headline,
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    maxWidth: 320,
  },
  cta: {
    marginTop: spacing.sm,
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg - 2,
  },
  ctaLabel: {
    color: palette.void,
  },
  footnote: {
    marginTop: spacing.sm,
  },
});
