import { memo } from 'react';
import { Text, TextStyle } from 'react-native';

import { densityCaps, type } from '@/theme/typography';

/**
 * The only way text enters a feed card. Each variant carries a hard line cap
 * so Blinkist-grade density is enforced by the component system itself —
 * a wall of text is unrepresentable, regardless of what the manifest sends.
 */
type Variant = keyof typeof type;

const lineCaps: Record<Variant, number | undefined> = {
  yearDisplay: 1,
  heroHeadline: densityCaps.heroHeadlineLines,
  headline: densityCaps.headlineLines,
  fact: densityCaps.factLines,
  label: 1,
  caption: 2,
};

interface SegmentedTextProps {
  variant: Variant;
  children: string;
  style?: TextStyle;
}

export const SegmentedText = memo(function SegmentedText({
  variant,
  children,
  style,
}: SegmentedTextProps) {
  return (
    <Text style={[type[variant], style]} numberOfLines={lineCaps[variant]} ellipsizeMode="tail">
      {children}
    </Text>
  );
});
