import { memo } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { palette, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * Who keeps the lights on, at the foot of the launch screen.
 *
 * Small and last on purpose. It is a credit, not an advertisement, and the
 * launch screen's job is to get the reader into the day — anything here that
 * competes with the tiles is working against the screen.
 *
 * Kept to the launch screen alone. The feed carries the archive's own credits
 * on every card, and a sponsor line in among them would read as though the
 * history were sponsored too.
 */
const SUPPORTER = {
  label: 'gridconvertpro.com',
  url: 'https://gridconvertpro.com',
} as const;

export const LaunchSupporter = memo(function LaunchSupporter() {
  return (
    <View style={styles.wrap}>
      <PressableScale
        onPress={() => {
          void Linking.openURL(SUPPORTER.url).catch(() => {
            // No browser, or the URL was refused. A credit line is not worth
            // an error dialog over.
          });
        }}
        style={styles.press}
        accessibilityLabel={`Supported by ${SUPPORTER.label}. Opens in your browser.`}
      >
        <Text style={styles.text} numberOfLines={1}>
          Supported by <Text style={styles.link}>{SUPPORTER.label}</Text>
        </Text>
      </PressableScale>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  press: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  text: {
    ...type.caption,
    fontSize: 11,
    color: palette.textTertiary,
    textAlign: 'center',
  },
  link: {
    color: palette.textSecondary,
  },
});
