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
interface CardFactStackProps {
  event: HistoricalEvent;
  /** The day's lead, which carries more chrome and so shows fewer facts. */
  hero?: boolean;
}

export const CardFactStack = memo(function CardFactStack({
  event,
  hero = false,
}: CardFactStackProps) {
  const openDetail = useEventDetailStore((s) => s.open);
  const shown = hero ? densityCaps.heroFactsShownOnCard : densityCaps.factsShownOnCard;

  return (
    <Pressable
      onPress={() => openDetail(event)}
      accessibilityRole="button"
      accessibilityLabel={`Read more about ${event.title}`}
      // The card's shock absorber. Everything else on a card is a fixed claim —
      // the year, the badges, the actions — so if something has to give when a
      // card does not fit, it has to be this. Without it the column overruns
      // upward and the header slides under the top bar; with it the panel
      // clips instead, which stays inside the card.
      style={styles.press}
    >
      <GlassPanel>
        <View style={styles.stack}>
          {event.facts.slice(0, shown).map((fact) => (
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
  press: {
    flexShrink: 1,
    overflow: 'hidden',
  },
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
