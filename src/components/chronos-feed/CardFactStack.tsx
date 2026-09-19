import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassPanel } from '@/components/primitives/GlassPanel';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useEventDetailStore } from '@/stores/useEventDetailStore';
import { palette, spacing } from '@/theme/tokens';
import { HistoricalEvent } from '@/types/manifest';

import { CardFactRow } from './CardFactRow';

/**
 * Micro-segmented fact blocks on a glass surface.
 *
 * Each row is capped at two lines to hold the feed's density, which means
 * longer facts visibly trail off. That truncation is an invitation, not a
 * defect: the whole panel is tappable and opens the reader, where nothing is
 * clipped and the full narrative sits underneath.
 */
export const CardFactStack = memo(function CardFactStack({ event }: { event: HistoricalEvent }) {
  const openDetail = useEventDetailStore((s) => s.open);

  return (
    <Pressable
      onPress={() => openDetail(event)}
      accessibilityRole="button"
      accessibilityLabel={`Read more about ${event.title}`}
    >
      <GlassPanel>
        <View style={styles.stack}>
          {event.facts.map((fact) => (
            <CardFactRow key={fact.id} icon={fact.icon} text={fact.text} />
          ))}
          <View style={styles.moreRow}>
            <SegmentedText variant="label" style={styles.more}>
              Read more
            </SegmentedText>
          </View>
        </View>
      </GlassPanel>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  moreRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.glassBorder,
    paddingTop: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  more: {
    color: palette.accent,
  },
});
