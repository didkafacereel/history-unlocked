import { memo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/primitives/BottomSheet';
import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useFeedStore } from '@/stores/useFeedStore';
import { useFilterSheetStore } from '@/stores/useFilterSheetStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { EventCategory } from '@/types/manifest';

/**
 * Narrow the day to one category.
 *
 * A sheet rather than a strip across the feed: nine categories will not fit on
 * one line without shrinking to unreadable, and the feed's top edge is already
 * carrying the date, the streak and the rank. This is a control you reach for
 * occasionally, not one that should cost permanent screen.
 *
 * Every row states its count, so the reader picks from what the day actually
 * holds instead of guessing and landing on an empty result.
 */
const ICONS: Record<EventCategory, string> = {
  'Military & Conflict': '⚔️',
  'Politics & Power': '🏛️',
  'Science & Technology': '🔬',
  'Exploration & Discovery': '🧭',
  'Culture & Ideas': '🎭',
  'Society & Rights': '✊',
  'Disaster & Tragedy': '🌋',
  'Sports & Games': '🏆',
  'Nations & Empires': '🗿',
};

export const CategoryFilterSheet = memo(function CategoryFilterSheet() {
  const open = useFilterSheetStore((s) => s.open);
  const onClose = useFilterSheetStore((s) => s.closeSheet);
  const counts = useFeedStore((s) => s.categoryCounts);
  const active = useFeedStore((s) => s.category);
  const total = useFeedStore((s) => s.dayEvents.length);
  const setCategory = useFeedStore((s) => s.setCategory);

  const present = (Object.keys(ICONS) as EventCategory[])
    .filter((c) => (counts[c] ?? 0) > 0)
    .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));

  const choose = (category: EventCategory | null) => {
    setCategory(category);
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <BottomSheet
      onClose={onClose}
      heightRatio={0.7}
      accessibilityLabel="Close the category filter"
      header={
        <View style={styles.header}>
          <Text style={styles.title}>Filter this day</Text>
          <SegmentedText variant="caption">
            {`${total} ${total === 1 ? 'event' : 'events'} recorded on this date`}
          </SegmentedText>
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <FilterRow
          glyph="✦"
          label="Everything"
          count={total}
          selected={active === null}
          onPress={() => choose(null)}
        />
        {present.map((category) => (
          <FilterRow
            key={category}
            glyph={ICONS[category]}
            label={category}
            count={counts[category] ?? 0}
            selected={active === category}
            onPress={() => choose(category)}
          />
        ))}
      </ScrollView>
    </BottomSheet>
  );
});

interface FilterRowProps {
  glyph: string;
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}

const FilterRow = memo(function FilterRow({
  glyph,
  label,
  count,
  selected,
  onPress,
}: FilterRowProps) {
  return (
    <PressableScale
      onPress={onPress}
      style={selected ? { ...styles.row, ...styles.rowSelected } : styles.row}
      accessibilityLabel={`${label}, ${count} ${count === 1 ? 'event' : 'events'}`}
    >
      <Text style={styles.glyph}>{glyph}</Text>
      <SegmentedText variant="fact" style={selected ? styles.labelActive : styles.label}>
        {label}
      </SegmentedText>
      <Text style={selected ? styles.countActive : styles.count}>{String(count)}</Text>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  title: {
    ...type.headline,
    fontSize: 20,
    lineHeight: 25,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
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
  rowSelected: {
    borderColor: palette.accent,
    backgroundColor: palette.accentDim,
  },
  glyph: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
  },
  label: {
    flex: 1,
    color: palette.textPrimary,
  },
  labelActive: {
    flex: 1,
    color: palette.accent,
  },
  count: {
    ...type.label,
    color: palette.textTertiary,
  },
  countActive: {
    ...type.label,
    color: palette.accent,
  },
});
