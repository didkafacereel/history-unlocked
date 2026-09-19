import { memo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { palette, spacing } from '@/theme/tokens';

/**
 * Attribution for the backdrop. Deliberately plain text rather than a link:
 * the feed is an immersive swipe loop and a tappable target this small would
 * mostly generate accidental exits. The event carries `imageSourceUrl` so a
 * dedicated sources list can link out properly.
 *
 * Every image we ship is public domain or CC — crediting the artist is both
 * good manners and what the CC licenses require.
 */
export const CardImageCredit = memo(function CardImageCredit({ credit }: { credit: string }) {
  return (
    <Text style={styles.credit} numberOfLines={1}>
      {`📷 ${credit}`}
    </Text>
  );
});

const styles = StyleSheet.create({
  credit: {
    fontSize: 10,
    lineHeight: 14,
    color: palette.textTertiary,
    paddingTop: spacing.xs,
  },
});
