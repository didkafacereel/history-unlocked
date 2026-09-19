import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GlassPanel } from '@/components/primitives/GlassPanel';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useEventDetailStore } from '@/stores/useEventDetailStore';
import { palette, spacing } from '@/theme/tokens';
import { HistoricalEvent } from '@/types/manifest';

import { CardFactRow } from './CardFactRow';
import { densityCaps } from '@/theme/typography';

/**
 * Micro-segmented fact blocks on a glass surface.
 *
 * Shows the first `factsShownOnCard` of them. An event may carry four and
 * often does, but four whole sentences overflow a phone — see the constant.
 * The panel is tappable and opens the reader, where nothing is clipped and the
 * full narrative sits underneath, so the card is a way in rather than a
 * complete account.
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
          {event.facts.slice(0, densityCaps.factsShownOnCard).map((fact) => (
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
