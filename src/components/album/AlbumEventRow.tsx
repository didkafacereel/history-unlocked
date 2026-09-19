import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { HistoricalEvent } from '@/types/manifest';

/**
 * One event in the album, or one candidate for it.
 *
 * The picture is not optional to the point of the feature: an album of ten
 * titles is a list, and nobody shows a list to anyone. The thumbnail is small
 * and cover-cropped here rather than contained — at 56px a contained image is
 * a stamp, and the row already carries the title to say what it is.
 */
interface AlbumEventRowProps {
  event: HistoricalEvent;
  /** Shown as the album position, 1-based. Absent for candidate rows. */
  position?: number;
  actionLabel: string;
  actionAccessibilityLabel: string;
  onAction: () => void;
  /** Greys the action out — a full album cannot take another. */
  actionDisabled?: boolean;
}

export const AlbumEventRow = memo(function AlbumEventRow({
  event,
  position,
  actionLabel,
  actionAccessibilityLabel,
  onAction,
  actionDisabled = false,
}: AlbumEventRowProps) {
  return (
    <View style={styles.row}>
      {position !== undefined ? <Text style={styles.position}>{position}</Text> : null}

      <View style={styles.thumb}>
        <Image
          source={{ uri: event.imageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
          accessibilityIgnoresInvertColors
        />
      </View>

      <View style={styles.body}>
        <Text style={styles.year}>{event.year < 0 ? `${-event.year} BCE` : event.year}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
      </View>

      <PressableScale
        onPress={actionDisabled ? () => {} : onAction}
        style={actionDisabled ? { ...styles.action, ...styles.actionOff } : styles.action}
        accessibilityLabel={actionAccessibilityLabel}
      >
        <SegmentedText variant="label" style={styles.actionLabel}>
          {actionLabel}
        </SegmentedText>
      </PressableScale>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  position: {
    ...type.label,
    color: palette.accent,
    width: 18,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: palette.void,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  year: {
    ...type.caption,
    color: palette.accent,
    fontVariant: ['tabular-nums'],
  },
  title: {
    ...type.caption,
    color: palette.textPrimary,
  },
  action: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  actionOff: {
    opacity: 0.35,
  },
  actionLabel: {
    color: palette.textSecondary,
    fontSize: 11,
  },
});
