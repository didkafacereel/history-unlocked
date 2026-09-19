import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { ArchiveStats, loadArchiveStats } from '@/data/ingestion';
import { useEventsReadCount } from '@/stores/useLibraryStore';
import { formatCount } from '@/lib/formatCount';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * "You have read N of M events." The reading library made visible.
 *
 * This is the counterweight to the obvious objection to a lifetime plan — that
 * a year of daily history must eventually repeat. Showing the fraction makes
 * the remaining depth concrete, and the bar is the one place in the app where
 * progress is measured against the archive rather than against a streak.
 */
export const ArchiveProgressPanel = memo(function ArchiveProgressPanel() {
  const read = useEventsReadCount();
  const [stats, setStats] = useState<ArchiveStats | null>(null);

  useEffect(() => {
    let active = true;
    void loadArchiveStats().then((s) => {
      if (active) {
        setStats(s);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const total = stats?.events ?? 0;
  // Clamped: a cached manifest can be smaller than the library it produced.
  const ratio = total > 0 ? Math.min(read / total, 1) : 0;

  return (
    <View style={styles.panel}>
      <SegmentedText variant="label">Your archive</SegmentedText>

      <View style={styles.readout}>
        <SegmentedText variant="yearDisplay" style={styles.count}>
          {String(read)}
        </SegmentedText>
        <SegmentedText variant="caption" style={styles.of}>
          {total > 0 ? `of ${formatCount(total)} events read` : 'events read'}
        </SegmentedText>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(ratio * 100, ratio > 0 ? 2 : 0)}%` }]} />
      </View>

      <SegmentedText variant="caption">
        {stats && stats.days > 0
          ? `${stats.days} days of history archived · nothing you have read is served twice`
          : 'Every event you open is remembered'}
      </SegmentedText>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  count: {
    ...type.yearDisplay,
    color: palette.accent,
    flexShrink: 0,
  },
  of: {
    flexShrink: 1,
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: palette.glass,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
  },
});
