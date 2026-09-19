import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { CollectionEntry } from '@/data/collections';
import { shortDateKeyLabel } from '@/lib/dateKey';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * One card in a set. Read events show their title and open the reader; unread
 * ones show only the year and the date they live on.
 *
 * Withholding the title is the entire mechanic. A locked row that already told
 * you what it was would be a list; a locked row that tells you WHEN to look is
 * an errand — and the errand is what brings a reader back to 14 March.
 */
interface CollectionEntryRowProps {
  entry: CollectionEntry;
  /** Drops the hunt framing — an atrocity is not an errand. */
  solemn?: boolean;
  onOpen: (entry: CollectionEntry) => void;
}

function formatYear(year: number): string {
  return year < 0 ? `${Math.abs(year)} BCE` : String(year);
}

export const CollectionEntryRow = memo(function CollectionEntryRow({
  entry,
  solemn = false,
  onOpen,
}: CollectionEntryRowProps) {
  const { event, read } = entry;

  if (!read) {
    return (
      <View style={styles.locked}>
        <Text style={styles.lockedYear}>{formatYear(event.year)}</Text>
        <SegmentedText variant="caption" style={styles.lockedHint}>
          {solemn
            ? `Not yet read · ${shortDateKeyLabel(event.dateKey)}`
            : `Unread — find it on ${shortDateKeyLabel(event.dateKey)}`}
        </SegmentedText>
      </View>
    );
  }

  return (
    <PressableScale
      onPress={() => onOpen(entry)}
      style={styles.row}
      accessibilityLabel={`Open ${event.title}`}
    >
      <Text style={styles.year}>{formatYear(event.year)}</Text>
      <View style={styles.body}>
        <SegmentedText variant="fact" style={styles.title}>
          {event.title}
        </SegmentedText>
        <SegmentedText variant="caption">{shortDateKeyLabel(event.dateKey)}</SegmentedText>
      </View>
      <Text style={styles.chevron}>›</Text>
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
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    borderColor: palette.glassBorder,
  },
  year: {
    ...type.label,
    color: palette.accent,
    minWidth: 62,
  },
  lockedYear: {
    ...type.label,
    color: palette.textTertiary,
    minWidth: 62,
  },
  lockedHint: {
    flex: 1,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: palette.textPrimary,
  },
  chevron: {
    color: palette.textTertiary,
    fontSize: 22,
    lineHeight: 24,
  },
});
