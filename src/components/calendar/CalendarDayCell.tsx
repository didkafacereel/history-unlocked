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
  /**
   * What the accent means, for a screen reader. The grid is reused by the
   * keepers calendar, where an accented day is one somebody owns rather than
   * one the archive covers.
   */
  markedLabel?: string;
  /**
   * Outside a free reader's window. Still pressable, deliberately: a dead cell
   * explains nothing, and the tap is what says why.
   */
  locked?: boolean;
  onSelect: (dateKey: string) => void;
}

export const CalendarDayCell = memo(function CalendarDayCell({
  day,
  dateKey,
  covered,
  isToday,
  markedLabel = 'has events',
  locked = false,
  onSelect,
}: CalendarDayCellProps) {
  return (
    <Pressable
      onPress={() => onSelect(dateKey)}
      style={[
        styles.cell,
        covered && styles.covered,
        locked && styles.locked,
        isToday && styles.today,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Day ${day}${covered ? `, ${markedLabel}` : ''}${
        locked ? ', needs Pro' : ''
      }`}
    >
      <Text
        style={[
          styles.num,
          covered ? styles.numCovered : styles.numEmpty,
          locked && styles.numLocked,
        ]}
      >
        {day}
      </Text>
      {/* The accent dot says "the archive has this day". A locked day still
          has it — that is the point of showing the lock rather than hiding
          the day — so the mark becomes the lock instead. */}
      {locked ? <Text style={styles.lock}>✦</Text> : covered ? <Text style={styles.dot}>•</Text> : null}
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
  // Knocked back rather than greyed out: the day exists and is worth wanting,
  // which is the whole argument the lock is making.
  locked: {
    backgroundColor: palette.inkRaised,
    borderColor: palette.glassBorder,
    opacity: 0.55,
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
  numLocked: {
    color: palette.textTertiary,
  },
  dot: {
    position: 'absolute',
    bottom: 2,
    color: palette.accent,
    fontSize: 10,
    lineHeight: 10,
  },
  lock: {
    position: 'absolute',
    bottom: 1,
    color: palette.accent,
    fontSize: 9,
    lineHeight: 10,
  },
});
