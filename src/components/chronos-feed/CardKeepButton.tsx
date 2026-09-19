import * as Haptics from 'expo-haptics';
import { memo } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useFavouritesStore, useIsKept } from '@/stores/useFavouritesStore';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * Keep this event.
 *
 * The one gesture in the feed that records a JUDGEMENT rather than an
 * observation — everything else the app stores about a reader (read, answered,
 * due) is something it watched them do. What they liked, only they can say, and
 * it is what the Founder's Album is made of.
 *
 * Free for everyone. The album that collects these is the paid part; the act of
 * keeping something must not be, or the album arrives empty on the day it is
 * bought.
 *
 * Subscribes to ONE boolean, so keeping an event re-renders this button and
 * nothing else in the deck.
 */
export const CardKeepButton = memo(function CardKeepButton({
  eventId,
  title,
}: {
  eventId: string;
  title: string;
}) {
  const kept = useIsKept(eventId);
  const toggle = useFavouritesStore((s) => s.toggle);

  return (
    <PressableScale
      onPress={() => {
        toggle(eventId);
        // Keeping is a small commitment and deserves to be felt. Web has no
        // haptics; calling through would throw on every press.
        if (Platform.OS !== 'web') {
          void Haptics.impactAsync(
            kept ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
          );
        }
      }}
      style={kept ? { ...styles.button, ...styles.buttonKept } : styles.button}
      accessibilityLabel={kept ? `Remove ${title} from your kept events` : `Keep ${title}`}
    >
      <Text style={kept ? styles.glyphKept : styles.glyph}>{kept ? '★' : '☆'}</Text>
      <SegmentedText variant="label" style={kept ? styles.labelKept : styles.label}>
        {kept ? 'Kept' : 'Keep'}
      </SegmentedText>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    backgroundColor: palette.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  buttonKept: {
    backgroundColor: palette.accentDim,
    borderColor: palette.accent,
  },
  glyph: {
    color: palette.textPrimary,
    fontSize: 15,
    lineHeight: 18,
  },
  glyphKept: {
    color: palette.accent,
    fontSize: 15,
    lineHeight: 18,
  },
  label: {
    color: palette.textPrimary,
  },
  labelKept: {
    color: palette.accent,
  },
});
