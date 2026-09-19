import { memo, PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { palette, radius, spacing } from '@/theme/tokens';

/**
 * Translucent text surface used over imagery. Intentionally a flat rgba fill,
 * not a BlurView: real-time blur under a 60fps gesture drops frames on
 * mid-range Android, and the scrim + fill reads identically at a glance.
 */
interface GlassPanelProps extends PropsWithChildren {
  style?: ViewStyle;
}

export const GlassPanel = memo(function GlassPanel({ children, style }: GlassPanelProps) {
  return <View style={[styles.panel, style]}>{children}</View>;
});

const styles = StyleSheet.create({
  panel: {
    backgroundColor: palette.glass,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    padding: spacing.lg,
  },
});
