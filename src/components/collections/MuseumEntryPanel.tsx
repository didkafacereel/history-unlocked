import { useRouter } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { COLLECTIONS } from '@/config/collections';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * Profile entry to the Museum.
 *
 * Deliberately not a progress readout: computing it means scanning the whole
 * archive, which is not work the profile should do on every visit. The set
 * glyphs carry the invitation instead — the board itself does the counting.
 */
export const MuseumEntryPanel = memo(function MuseumEntryPanel() {
  const router = useRouter();

  return (
    <PressableScale
      onPress={() => router.push('/collections')}
      style={styles.panel}
      accessibilityLabel="Open the Museum"
    >
      <View style={styles.text}>
        <SegmentedText variant="label">The Museum</SegmentedText>
        <SegmentedText variant="caption">
          {`${COLLECTIONS.length} sets to hunt down across the archive`}
        </SegmentedText>
        <Text style={styles.glyphs}>{COLLECTIONS.map((c) => c.glyph).join(' ')}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  glyphs: {
    fontSize: 17,
    lineHeight: 24,
    marginTop: spacing.xs,
  },
  chevron: {
    color: palette.textTertiary,
    fontSize: 24,
    lineHeight: 26,
  },
});
