import { memo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useOverlayStore } from '@/stores/useOverlayStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { TacticalData } from '@/types/manifest';

/**
 * The card-level entry point to the Tactical Deep Dive. Rendered ONLY for
 * events whose manifest entry carries tactical data — the caller gates it,
 * the type makes the payload non-optional here.
 */
interface TacticalTriggerProps {
  eventTitle: string;
  tactical: TacticalData;
}

export const TacticalTrigger = memo(function TacticalTrigger({
  eventTitle,
  tactical,
}: TacticalTriggerProps) {
  const open = useOverlayStore((s) => s.open);

  return (
    <PressableScale
      onPress={() => open({ eventTitle, tactical })}
      style={styles.trigger}
      accessibilityLabel={`Open tactical view for ${eventTitle}`}
    >
      <Text style={styles.glyph}>⌖</Text>
      <SegmentedText variant="label" style={styles.label}>
        Tactical View
      </SegmentedText>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  trigger: {
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
    fontSize: 14,
    lineHeight: 16,
  },
  label: {
    color: palette.accent,
  },
});
