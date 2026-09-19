import { useRouter } from 'expo-router';
import { memo, PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useIsPro } from '@/stores/useEntitlementStore';
import { palette, radius, spacing } from '@/theme/tokens';

import { PressableScale } from './PressableScale';
import { SegmentedText } from './SegmentedText';

/**
 * Wave 0 gating primitive. Renders children for Pro users; otherwise renders
 * `fallback`, or a default lock chip that routes to the paywall. Every Pro
 * feature in later waves wraps its entry point in this — same pattern as
 * TacticalTrigger gating on `event.tactical`.
 */
interface ProGateProps extends PropsWithChildren {
  fallback?: ReactNode;
}

export const ProGate = memo(function ProGate({ children, fallback }: ProGateProps) {
  const isPro = useIsPro();
  if (isPro) {
    return <>{children}</>;
  }
  return <>{fallback ?? <ProLockChip />}</>;
});

/** Compact "Pro" affordance that opens the paywall. */
export const ProLockChip = memo(function ProLockChip({ label = 'Unlock with Pro' }: { label?: string }) {
  const router = useRouter();
  return (
    <PressableScale
      onPress={() => router.push('/paywall')}
      style={styles.chip}
      accessibilityLabel="Unlock this with Pro"
    >
      <Text style={styles.glyph}>✦</Text>
      <SegmentedText variant="label" style={styles.label}>
        {label}
      </SegmentedText>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    backgroundColor: palette.accentDim,
  },
  glyph: {
    color: palette.accent,
    fontSize: 13,
    lineHeight: 16,
  },
  label: {
    color: palette.accent,
  },
});
