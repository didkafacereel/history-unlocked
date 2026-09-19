import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { FOUNDER_GENERATIONS, generationOnSale } from '@/services/founders';
import { useFoundersStore } from '@/stores/useFoundersStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * Which generation of founders is on sale, and how much of it is left.
 *
 * The whole tier rests on these numbers being TRUE. Research on scarcity is
 * unambiguous that a real cap converts and an invented one corrodes — and for
 * an app whose product is "we tell you the truth about the past", being caught
 * running a fake counter costs more than the seats are worth. So: no countdown
 * timer, no "only 3 left!", and the band never reopens once it fills.
 *
 * Showing the LATER generations, greyed and priced higher, is what makes the
 * urgency provable rather than asserted: the reader can see exactly what
 * waiting costs, in numbers the app will have to honour.
 */
export const FounderSeatsRow = memo(function FounderSeatsRow() {
  const loaded = useFoundersStore((s) => s.loaded);
  const taken = useFoundersStore((s) => s.status.seatsTaken);

  if (!loaded || taken === 0) {
    return null;
  }

  const current = generationOnSale(taken);
  if (!current) {
    return (
      <View style={styles.row}>
        <SegmentedText variant="label" style={styles.label}>
          Founder seats
        </SegmentedText>
        <SegmentedText variant="caption">
          Every generation is taken. Lifetime is closed for good.
        </SegmentedText>
      </View>
    );
  }

  const size = current.lastSeat - current.firstSeat + 1;
  const usedHere = taken - current.firstSeat + 1;
  const remaining = current.lastSeat - taken;
  const ratio = Math.min(Math.max(usedHere / size, 0), 1);

  return (
    <View style={styles.row}>
      <View style={styles.head}>
        <SegmentedText variant="label" style={styles.label}>
          {`${current.name} · ${current.price}`}
        </SegmentedText>
        <Text style={styles.count}>{`${remaining} left`}</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(ratio * 100, 2)}%` }]} />
      </View>

      {/* Plain Text, for the reason given in PaywallFeatureRow: the two-line
          caption cap belongs to feed cards, and the first-generation line
          wraps to three on a phone. Cutting the sentence that explains why
          this price is the lowest it will ever be defeats the point of it. */}
      <Text style={type.caption}>
        {current.ordinal === 1
          ? `Seats ${current.firstSeat}–${current.lastSeat}, at the lowest price this will ever be. You are buying early, so you pay least.`
          : `Seats ${current.firstSeat}–${current.lastSeat}. Your number is yours for good.`}
      </Text>

      <View style={styles.ladder}>
        {FOUNDER_GENERATIONS.map((generation) => {
          const done = generation.lastSeat <= taken;
          const active = generation.ordinal === current.ordinal;
          return (
            <View key={generation.ordinal} style={styles.rung}>
              <Text style={active ? styles.rungNowLabel : styles.rungLabel}>
                {`${generation.numeral}${done ? ' · gone' : ''}`}
              </Text>
              <Text style={active ? styles.rungNowPrice : styles.rungPrice}>
                {generation.price}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.accent,
    backgroundColor: palette.accentDim,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  label: {
    color: palette.accent,
    flexShrink: 1,
  },
  count: {
    ...type.label,
    color: palette.textPrimary,
    flexShrink: 0,
  },
  track: {
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: palette.glass,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
  },
  // The price ladder: what the next generations will cost, stated up front.
  ladder: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  rung: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  rungLabel: {
    ...type.label,
    color: palette.textTertiary,
  },
  rungNowLabel: {
    ...type.label,
    color: palette.accent,
  },
  rungPrice: {
    ...type.caption,
    fontSize: 11,
    color: palette.textTertiary,
  },
  rungNowPrice: {
    ...type.caption,
    fontSize: 11,
    color: palette.textPrimary,
  },
});
