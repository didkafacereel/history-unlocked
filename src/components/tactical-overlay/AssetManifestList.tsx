import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { spacing } from '@/theme/tokens';
import { TacticalAsset } from '@/types/manifest';

import { AssetChip } from './AssetChip';

/** "Hardware & Assets" section of the tactical sheet. */
interface AssetManifestListProps {
  assets: TacticalAsset[];
}

export const AssetManifestList = memo(function AssetManifestList({
  assets,
}: AssetManifestListProps) {
  return (
    <View style={styles.section}>
      <SegmentedText variant="label">Hardware & Assets</SegmentedText>
      <View style={styles.list}>
        {assets.map((asset) => (
          <AssetChip
            key={asset.id}
            name={asset.name}
            quantity={asset.quantity}
            faction={asset.faction}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
});
