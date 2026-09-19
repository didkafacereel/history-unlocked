import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { isoDateKey } from '@/lib/dateKey';
import { useProgressionStore } from '@/stores/useProgressionStore';
import { palette, radius, spacing } from '@/theme/tokens';

/** Sunday first, matching `Date.getDay()`. */
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

/**
 * Last seven local days. A 🔥 cell = quiz completed; a ❄️ cell = the day was
 * missed but a Pro streak shield bridged it (so the streak survived).
 */
export const StreakCalendarStrip = memo(function StreakCalendarStrip() {
  const completedDates = useProgressionStore((s) => s.completedDates);
  const frozenDates = useProgressionStore((s) => s.frozenDates);

  const days = useMemo(() => {
    const completed = new Set(completedDates);
    const frozen = new Set(frozenDates);
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i));
      const key = isoDateKey(date);
      return {
        key,
        // Not toLocaleDateString: it follows the device language, and this app
        // is English-only. See monthLabel in lib/dateKey.ts.
        weekday: WEEKDAY_INITIALS[date.getDay()] ?? '',
        done: completed.has(key),
        frozen: frozen.has(key),
        isToday: i === 6,
      };
    });
  }, [completedDates, frozenDates]);

  return (
    <View style={styles.strip}>
      {days.map((day) => (
        <View key={day.key} style={styles.dayCol}>
          <SegmentedText variant="label" style={day.isToday ? styles.todayLabel : undefined}>
            {day.weekday}
          </SegmentedText>
          <View
            style={[
              styles.cell,
              day.done && styles.cellDone,
              day.frozen && styles.cellFrozen,
              day.isToday && styles.cellToday,
            ]}
          >
            {day.done ? (
              <Text style={styles.cellGlyph}>🔥</Text>
            ) : day.frozen ? (
              <Text style={styles.cellGlyph}>❄️</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
});

const CELL = 34;

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCol: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  todayLabel: {
    color: palette.accent,
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: radius.sm,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDone: {
    backgroundColor: 'rgba(255, 107, 53, 0.18)',
    borderColor: palette.streakFlame,
  },
  cellFrozen: {
    backgroundColor: 'rgba(61, 162, 220, 0.18)',
    borderColor: '#3DA2DC',
  },
  cellToday: {
    borderColor: palette.accent,
    borderWidth: 1,
  },
  cellGlyph: {
    fontSize: 14,
  },
});
