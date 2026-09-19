import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { palette, radius } from '@/theme/tokens';

/**
 * One day in the Time Machine grid. "Covered" days (the archive has events)
 * are tappable and accented; uncovered days are dimmed but still selectable so
 * the feed can show an honest empty state.
 */
interface CalendarDayCellProps {
  day: number;
  dateKey: string;
  covered: boolean;
  isToday: boolean;
  onSelect: (dateKey: string) => void;
}

export const CalendarDayCell = memo(function CalendarDayCell({
  day,
  dateKey,
  covered,
  isToday,
  onSelect,
}: CalendarDayCellProps) {
  return (
    <Pressable
      onPress={() => onSelect(dateKey)}
      style={[styles.cell, covered && styles.covered, isToday && styles.today]}
      accessibilityRole="button"
      accessibilityLabel={`Day ${day}${covered ? ', has events' : ''}`}
    >
      <Text style={[styles.num, covered ? styles.numCovered : styles.numEmpty]}>{day}</Text>
      {covered ? <Text style={styles.dot}>•</Text> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 3,
    borderRadius: radius.md,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  covered: {
    backgroundColor: palette.accentDim,
    borderColor: palette.accent,
  },
  today: {
    borderWidth: 2,
    borderColor: palette.textPrimary,
  },
  num: {
    fontSize: 15,
    fontWeight: '700',
  },
  numCovered: {
    color: palette.accent,
  },
  numEmpty: {
    color: palette.textTertiary,
  },
  dot: {
    position: 'absolute',
    bottom: 2,
    color: palette.accent,
    fontSize: 10,
    lineHeight: 10,
  },
});
