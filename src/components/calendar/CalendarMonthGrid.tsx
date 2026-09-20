import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { daysInMonth, makeDateKey, monthLabel } from '@/lib/dateKey';
import { palette, radius, spacing } from '@/theme/tokens';

import { CalendarDayCell } from './CalendarDayCell';

/**
 * A single month of day cells with ‹ / › navigation. No weekday alignment by
 * design — entries are keyed by calendar day across all years ("this day in
 * history"), so a weekday grid would be meaningless.
 */
interface CalendarMonthGridProps {
  month: number;
  coveredDays: Set<number>;
  todayDay: number | null;
  /** What an accented day means. Passed through to each cell for a11y. */
  markedLabel?: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelect: (dateKey: string) => void;
}

export const CalendarMonthGrid = memo(function CalendarMonthGrid({
  month,
  coveredDays,
  todayDay,
  markedLabel,
  onPrevMonth,
  onNextMonth,
  onSelect,
}: CalendarMonthGridProps) {
  // Chunk into explicit rows of 7 so flex:1 cells size to a true 7-column grid
  // (flexWrap + flex:1 would collapse each row to a single cell).
  const rows = useMemo(() => {
    const days = Array.from({ length: daysInMonth(month) }, (_, i) => i + 1);
    const chunked: number[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      chunked.push(days.slice(i, i + 7));
    }
    return chunked;
  }, [month]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <PressableScale onPress={onPrevMonth} style={styles.nav} accessibilityLabel="Previous month">
          <Text style={styles.navGlyph}>‹</Text>
        </PressableScale>
        <SegmentedText variant="headline" style={styles.monthName}>
          {monthLabel(month)}
        </SegmentedText>
        <PressableScale onPress={onNextMonth} style={styles.nav} accessibilityLabel="Next month">
          <Text style={styles.navGlyph}>›</Text>
        </PressableScale>
      </View>

      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((day) => (
              <CalendarDayCell
                key={day}
                day={day}
                dateKey={makeDateKey(month, day)}
                covered={coveredDays.has(day)}
                isToday={todayDay === day}
                markedLabel={markedLabel}
                onSelect={onSelect}
              />
            ))}
            {row.length < 7
              ? Array.from({ length: 7 - row.length }, (_, i) => (
                  <View key={`pad-${i}`} style={styles.pad} />
                ))
              : null}
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nav: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: palette.inkRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navGlyph: {
    color: palette.textPrimary,
    fontSize: 24,
    lineHeight: 26,
  },
  monthName: {
    textAlign: 'center',
  },
  grid: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
  },
  pad: {
    flex: 1,
    aspectRatio: 1,
    margin: 3,
  },
});
