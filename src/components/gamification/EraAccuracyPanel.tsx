import { useRouter } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useIsPro } from '@/stores/useEntitlementStore';
import {
  accuracyOf,
  MIN_ANSWERS_FOR_ACCURACY,
  useEraAccuracyStore,
} from '@/stores/useEraAccuracyStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { Era } from '@/types/manifest';

/**
 * What the reader actually knows, by era — and the way into the endless
 * simulations that move it.
 *
 * Every other number in the app is about turning up: XP, streak, events read.
 * This is the only one about having learned something, which is the promise the
 * archive is really making. It is also what makes an endless practice mode
 * worth entering: a run through Medieval that takes 41% to 58% is a result,
 * where "you scored 6/10" is a receipt.
 *
 * An era with too few answers shows its count instead of a percentage. Three
 * answers cannot tell a reader anything about themselves, and printing "33%"
 * from one wrong answer would be a claim the data does not support.
 */
const ERAS: Era[] = ['Ancient', 'Classical', 'Medieval', 'Early Modern', 'Industrial', 'Modern'];

export const EraAccuracyPanel = memo(function EraAccuracyPanel() {
  const router = useRouter();
  const tallies = useEraAccuracyStore((s) => s.tallies);
  const isPro = useIsPro();

  const answered = ERAS.reduce((sum, era) => sum + (tallies[era]?.seen ?? 0), 0);

  return (
    <View style={styles.panel}>
      <SegmentedText variant="label">Simulations</SegmentedText>

      {answered === 0 ? (
        <SegmentedText variant="caption">
          Six thousand written scenarios across the archive. Answer some and this
          becomes a map of what you know.
        </SegmentedText>
      ) : (
        <View style={styles.rows}>
          {ERAS.map((era) => {
            const tally = tallies[era];
            const accuracy = accuracyOf(tally);
            return (
              <View key={era} style={styles.row}>
                <Text style={styles.era} numberOfLines={1}>
                  {era}
                </Text>
                <View style={styles.track}>
                  {accuracy !== null ? (
                    <View style={[styles.fill, { width: `${Math.round(accuracy * 100)}%` }]} />
                  ) : null}
                </View>
                <Text style={accuracy !== null ? styles.value : styles.valueThin}>
                  {accuracy !== null
                    ? `${Math.round(accuracy * 100)}%`
                    : `${tally?.seen ?? 0}/${MIN_ANSWERS_FOR_ACCURACY}`}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <PressableScale
        onPress={() => router.push(isPro ? '/simulations' : '/paywall')}
        style={styles.cta}
        accessibilityLabel={isPro ? 'Run the archive' : 'Unlock simulations with Pro'}
      >
        <SegmentedText variant="label" style={styles.ctaLabel}>
          {isPro ? 'Run the archive' : '✦ Unlock with Pro'}
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
  rows: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  era: {
    ...type.caption,
    color: palette.textSecondary,
    width: 92,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.void,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: palette.accent,
  },
  value: {
    ...type.caption,
    color: palette.textPrimary,
    width: 40,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  // Too few answers to state a percentage — the count says why.
  valueThin: {
    ...type.caption,
    color: palette.textTertiary,
    width: 40,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
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
});
