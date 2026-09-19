import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { todayDateKey } from '@/lib/dateKey';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * "TODAY'S LEAD" — the marker on the one card pinned to the front of the day.
 *
 * Sorting a day strictly by year buried its strongest event past the third card
 * on 80% of dates, so the deck now leads with it. This badge is what makes that
 * legible: without it the reader just sees a timeline that starts in the wrong
 * place. The wording changes on a Time Machine date, because "today" would be a
 * small lie on 14 March.
 */
export const CardLeadBadge = memo(function CardLeadBadge({ dateKey }: { dateKey: string }) {
  const isToday = dateKey === todayDateKey();

  return (
    <View style={styles.badge}>
      <SegmentedText variant="label" style={styles.label}>
        {isToday ? '★ Today’s lead' : '★ The day’s lead'}
      </SegmentedText>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    // Outlined rather than filled: the NEW pill beside it is solid accent, and
    // two solid amber chips in one row read as a warning, not a hierarchy.
    borderWidth: 1,
    borderColor: palette.accent,
    backgroundColor: palette.accentDim,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    flexShrink: 0,
  },
  label: {
    color: palette.accent,
  },
});
