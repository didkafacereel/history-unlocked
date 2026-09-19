import { useRouter } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useIsPro } from '@/stores/useEntitlementStore';
import { useProgressionStore } from '@/stores/useProgressionStore';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * Streak shields. Everyone now holds at least one a month, so the free state is
 * no longer a locked door — it is the real thing, at a slower rate, with the
 * upgrade stated plainly underneath. A reader who has felt a shield save a
 * 40-day streak needs no explanation of why two a week is worth paying for.
 * Subscribes only to isPro and the freeze count.
 */
export const StreakShieldRow = memo(function StreakShieldRow() {
  const router = useRouter();
  const isPro = useIsPro();
  const freezes = useProgressionStore((s) => s.streakFreezes);

  if (isPro || freezes > 0) {
    return (
      <View style={styles.row}>
        <Text style={styles.glyph}>🛡️</Text>
        <View style={styles.text}>
          <SegmentedText variant="fact" style={styles.title}>
            {`${freezes} streak ${freezes === 1 ? 'shield' : 'shields'}`}
          </SegmentedText>
          <SegmentedText variant="caption">
            {isPro
              ? 'Miss a day and a shield keeps your streak alive. Two a week.'
              : 'Miss a day and a shield keeps your streak alive. One a month.'}
          </SegmentedText>
        </View>
      </View>
    );
  }

  return (
    <PressableScale
      onPress={() => router.push('/paywall')}
      style={styles.upsell}
      accessibilityLabel="Unlock streak shields with Pro"
    >
      <Text style={styles.glyph}>🛡️</Text>
      <View style={styles.text}>
        <SegmentedText variant="fact" style={styles.upsellTitle}>
          Streak Shield
        </SegmentedText>
        <SegmentedText variant="caption">
          Your next shield arrives within the month — or get two a week with Pro.
        </SegmentedText>
      </View>
      <Text style={styles.lock}>✦</Text>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  upsell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  glyph: {
    fontSize: 22,
    width: 28,
    textAlign: 'center',
  },
  text: {
    flex: 1,
    gap: 1,
  },
  title: {
    color: palette.textPrimary,
    fontWeight: '700',
  },
  upsellTitle: {
    color: palette.textPrimary,
    fontWeight: '700',
  },
  lock: {
    color: palette.accent,
    fontSize: 12,
  },
});
