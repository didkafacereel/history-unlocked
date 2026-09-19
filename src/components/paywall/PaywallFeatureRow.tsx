import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { ProFeatureCopy } from '@/config/pro';
import { spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * One Pro benefit: glyph + title + description.
 *
 * The description is a plain `Text`, NOT `SegmentedText`. That component caps
 * a caption at two lines and cuts the rest with an ellipsis, which is the
 * right rule for a feed card — density is the product there — and the wrong
 * one here. These descriptions run to 135 characters and wrap to three lines
 * on a phone, so on the actual device the paywall read "one date of the year
 * kept in your…" and "Free shows three; Pro opens all of …". Asking someone to
 * guess what they are buying is the one place truncation costs real money.
 */
export const PaywallFeatureRow = memo(function PaywallFeatureRow({ icon, title, description }: ProFeatureCopy) {
  return (
    <View style={styles.row}>
      <Text style={styles.icon}>{icon}</Text>
      <View style={styles.text}>
        <SegmentedText variant="fact" style={styles.title}>
          {title}
        </SegmentedText>
        <Text style={type.caption}>{description}</Text>
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
