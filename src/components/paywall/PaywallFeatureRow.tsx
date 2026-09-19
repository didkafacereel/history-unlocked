import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { ProFeatureCopy } from '@/config/pro';
import { spacing } from '@/theme/tokens';

/** One Pro benefit: glyph + title + one-line description. */
export const PaywallFeatureRow = memo(function PaywallFeatureRow({ icon, title, description }: ProFeatureCopy) {
  return (
    <View style={styles.row}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.text}>
        <SegmentedText variant="fact" style={styles.title}>
          {title}
        </SegmentedText>
        <SegmentedText variant="caption">{description}</SegmentedText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  icon: {
    fontSize: 22,
    lineHeight: 26,
    width: 30,
    textAlign: 'center',
  },
  text: {
    flex: 1,
    gap: 1,
  },
  title: {
    color: '#F4F6FB',
    fontWeight: '700',
  },
});
