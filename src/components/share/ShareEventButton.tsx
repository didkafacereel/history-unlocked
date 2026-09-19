import { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { palette, radius, spacing } from '@/theme/tokens';
import { HistoricalEvent } from '@/types/manifest';

import { ShareCard, SHARE_HEIGHT, SHARE_WIDTH } from './ShareCard';
import { useShareEvent } from './useShareEvent';

/**
 * Share affordance for one event. It owns the off-screen poster too: the card
 * is mounted here, scaled down and pushed outside the viewport, so it is laid
 * out and ready to capture the instant the user taps — no flash, no modal.
 */
export const ShareEventButton = memo(function ShareEventButton({
  event,
}: {
  event: HistoricalEvent;
}) {
  const { cardRef, share, sharing, previewScale } = useShareEvent({
    id: event.id,
    title: event.title,
    year: event.year,
  });

  return (
    <>
      <PressableScale
        onPress={() => {
          void share();
        }}
        style={styles.button}
        accessibilityLabel={`Share ${event.title}`}
      >
        {sharing ? (
          <ActivityIndicator color={palette.textPrimary} size="small" />
        ) : (
          <Text style={styles.glyph}>↗</Text>
        )}
        <SegmentedText variant="label" style={styles.label}>
          Share
        </SegmentedText>
      </PressableScale>

      {/* Off-screen render target for the exported image. */}
      <View style={styles.offscreen} pointerEvents="none" collapsable={false}>
        <View
          style={{
            width: SHARE_WIDTH,
            height: SHARE_HEIGHT,
            transform: [{ scale: previewScale }],
          }}
        >
          <ShareCard ref={cardRef} event={event} />
        </View>
      </View>
    </>
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
  glyph: {
    color: palette.textPrimary,
    fontSize: 15,
    lineHeight: 18,
  },
  label: {
    color: palette.textPrimary,
  },
  offscreen: {
    position: 'absolute',
    // Far outside any viewport: present in the tree (so it can be captured)
    // but never visible and never affecting layout.
    left: -10_000,
    top: -10_000,
    opacity: 0,
  },
});
