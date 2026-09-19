import { useRouter } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useOverlayStore } from '@/stores/useOverlayStore';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * Free-tier wall inside the tactical sheet: assets are the teaser, commanders
 * and strategic impact are Pro. Opening the paywall closes the sheet first so
 * the modal doesn't stack on top of the overlay.
 */
export const TacticalLockPanel = memo(function TacticalLockPanel() {
  const router = useRouter();
  const close = useOverlayStore((s) => s.close);

  return (
    <PressableScale
      onPress={() => {
        close();
        router.push('/paywall');
      }}
      style={styles.panel}
      accessibilityLabel="Unlock full tactical intel with Pro"
    >
      <Text style={styles.glyph}>✦</Text>
      <SegmentedText variant="label" style={styles.title}>
        Full Tactical Intel
      </SegmentedText>
      <SegmentedText variant="caption" style={styles.body}>
        Key commanders and long-term strategic impact are part of Pro. Unlock the full deep dive on
        every major event.
      </SegmentedText>
      <View style={styles.cta}>
        <SegmentedText variant="label" style={styles.ctaLabel}>
          Unlock with Pro
        </SegmentedText>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  panel: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.accentDim,
    borderWidth: 1,
    borderColor: palette.accent,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  glyph: {
    fontSize: 28,
    color: palette.accent,
  },
  title: {
    color: palette.accent,
  },
  body: {
    textAlign: 'center',
  },
  cta: {
    marginTop: spacing.sm,
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  ctaLabel: {
    color: palette.void,
  },
});
