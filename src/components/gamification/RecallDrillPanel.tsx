import { useRouter } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useIsPro } from '@/stores/useEntitlementStore';
import { useDueCount, useRetainedCount } from '@/stores/useRecallStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * Entry point for the spaced-repetition drill.
 *
 * The number is the whole pitch: "12 due" is a standing, honest reason to open
 * the app on a day the reader has already read the feed — the one thing a
 * calendar-shaped product otherwise cannot offer. Free readers see the count
 * (the value is legible before it is bought) but the drill itself is Pro.
 */
export const RecallDrillPanel = memo(function RecallDrillPanel() {
  const router = useRouter();
  const due = useDueCount();
  const retained = useRetainedCount();
  const isPro = useIsPro();

  return (
    <View style={styles.panel}>
      <SegmentedText variant="label">Recall</SegmentedText>

      <View style={styles.readout}>
        <Text style={styles.count}>{due}</Text>
        <SegmentedText variant="caption" style={styles.of}>
          {due === 1 ? 'event due for review' : 'events due for review'}
        </SegmentedText>
      </View>

      <SegmentedText variant="caption">
        {retained > 0
          ? `${retained} held in memory · answered right, and scheduled to return`
          : 'Answer a quiz and events start coming back on a schedule'}
      </SegmentedText>

      <PressableScale
        onPress={() => router.push(isPro ? '/recall' : '/paywall')}
        style={due > 0 ? styles.cta : styles.ctaQuiet}
        accessibilityLabel={isPro ? 'Start the recall drill' : 'Unlock recall drills with Pro'}
      >
        <SegmentedText variant="label" style={due > 0 ? styles.ctaLabel : styles.ctaQuietLabel}>
          {isPro ? 'Start drill' : '✦ Unlock with Pro'}
        </SegmentedText>
      </PressableScale>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  count: {
    ...type.yearDisplay,
    color: palette.accent,
    flexShrink: 0,
  },
  of: {
    flexShrink: 1,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  ctaLabel: {
    color: palette.void,
  },
  // Nothing due: the button stays reachable but stops competing for attention.
  ctaQuiet: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  ctaQuietLabel: {
    color: palette.textSecondary,
  },
});
