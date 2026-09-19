import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { SubscriptionPackage } from '@/services/purchases';
import { palette, radius, spacing } from '@/theme/tokens';

/** A selectable price option on the paywall. */
interface PackageCardProps {
  pkg: SubscriptionPackage;
  selected: boolean;
  onSelect: (id: string) => void;
}

export const PackageCard = memo(function PackageCard({ pkg, selected, onSelect }: PackageCardProps) {
  return (
    <PressableScale
      onPress={() => onSelect(pkg.id)}
      style={{ ...styles.card, ...(selected ? styles.cardSelected : null) }}
      accessibilityLabel={`${pkg.title}, ${pkg.priceString}`}
    >
      <View style={styles.left}>
        <SegmentedText variant="fact" style={styles.title}>
          {pkg.title}
        </SegmentedText>
        {pkg.subtitle ? (
          <SegmentedText variant="caption" style={selected ? styles.subtitleOn : undefined}>
            {pkg.subtitle}
          </SegmentedText>
        ) : null}
      </View>
      <SegmentedText variant="fact" style={selected ? styles.priceOn : styles.price}>
        {pkg.priceString}
      </SegmentedText>
      {pkg.highlight ? (
        <View style={styles.badge}>
          <SegmentedText variant="label" style={styles.badgeText}>
            Popular
          </SegmentedText>
        </View>
      ) : null}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: palette.inkRaised,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: palette.glassBorder,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  cardSelected: {
    borderColor: palette.accent,
    backgroundColor: palette.accentDim,
  },
  left: {
    flex: 1,
    gap: 1,
  },
  title: {
    color: palette.textPrimary,
    fontWeight: '700',
  },
  subtitleOn: {
    color: palette.accent,
  },
  price: {
    color: palette.textSecondary,
    fontWeight: '700',
  },
  priceOn: {
    color: palette.accent,
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    top: -9,
    right: spacing.lg,
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  badgeText: {
    color: palette.void,
    fontSize: 10,
  },
});
