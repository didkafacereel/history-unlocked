import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { shortDateKeyLabel } from '@/lib/dateKey';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { HistoricalEvent } from '@/types/manifest';

/** One search hit: when it happened, what it was, and which day holds it. */
interface SearchResultRowProps {
  event: HistoricalEvent;
  onPress: (event: HistoricalEvent) => void;
}

export const SearchResultRow = memo(function SearchResultRow({
  event,
  onPress,
}: SearchResultRowProps) {
  const year = event.year < 0 ? `${Math.abs(event.year)} BCE` : String(event.year);

  return (
    <PressableScale
      onPress={() => onPress(event)}
      style={styles.row}
      accessibilityLabel={`${event.title}, ${year}`}
    >
      <View style={styles.stamp}>
        <Text style={styles.year}>{year}</Text>
        <Text style={styles.date}>{shortDateKeyLabel(event.dateKey)}</Text>
      </View>
      <View style={styles.body}>
        <SegmentedText variant="fact" style={styles.title}>
          {event.title}
        </SegmentedText>
        {event.category ? (
          <SegmentedText variant="caption">{event.category}</SegmentedText>
        ) : null}
      </View>
      {event.cornerstone ? <Text style={styles.star}>★</Text> : null}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  stamp: {
    width: 62,
    flexShrink: 0,
  },
  year: {
    ...type.label,
    color: palette.accent,
  },
  date: {
    ...type.caption,
    fontSize: 11,
    color: palette.textTertiary,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: palette.textPrimary,
  },
  star: {
    color: palette.accent,
    fontSize: 13,
  },
});
