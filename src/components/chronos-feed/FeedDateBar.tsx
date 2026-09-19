import { useRouter } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { shortDateKeyLabel, todayDateKey } from '@/lib/dateKey';
import { useIsPro } from '@/stores/useEntitlementStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { useFilterSheetStore } from '@/stores/useFilterSheetStore';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * Top-center feed control: the day being viewed, the Time Machine, and the
 * category filter. Pro → calendar and filter; free → paywall. When viewing a
 * past day a "Today" pill appears to jump back.
 *
 * The filter chip only exists once a day carries enough to be worth narrowing —
 * on a three-event free day it would be a control with nothing to do.
 */
const FILTER_WORTH_IT = 6;

export const FeedDateBar = memo(function FeedDateBar() {
  const router = useRouter();
  const dateKey = useFeedStore((s) => s.dateKey);
  const loadDeck = useFeedStore((s) => s.loadDeck);
  const dayCount = useFeedStore((s) => s.dayEvents.length);
  const category = useFeedStore((s) => s.category);
  const isPro = useIsPro();
  // The sheet itself renders next to the deck, not here — see useFilterSheetStore.
  const openFilter = useFilterSheetStore((s) => s.openSheet);

  const onToday = dateKey === null || dateKey === todayDateKey();
  const label = onToday ? 'Today' : shortDateKeyLabel(dateKey);
  const showFilter = dayCount >= FILTER_WORTH_IT;

  return (
    <View style={styles.bar} pointerEvents="box-none">
      <View style={styles.row}>
        <PressableScale
          onPress={() => router.push(isPro ? '/calendar' : '/paywall')}
          style={{ ...styles.chip, ...(onToday ? {} : styles.chipActive) }}
          accessibilityLabel="Open the Time Machine calendar"
        >
          <Text style={styles.glyph}>📅</Text>
          <SegmentedText variant="label" style={onToday ? styles.label : styles.labelActive}>
            {label}
          </SegmentedText>
          {isPro ? null : <Text style={styles.lock}>✦</Text>}
        </PressableScale>

        {showFilter ? (
          <PressableScale
            onPress={() => (isPro ? openFilter() : router.push('/paywall'))}
            style={{ ...styles.chip, ...(category ? styles.chipActive : {}) }}
            accessibilityLabel={
              category ? `Filtered to ${category}. Change the filter` : 'Filter this day by category'
            }
          >
            <Text style={styles.glyph}>⌗</Text>
            <SegmentedText variant="label" style={category ? styles.labelActive : styles.label}>
              {category ? category.split(' ')[0] ?? 'Filter' : 'Filter'}
            </SegmentedText>
            {isPro ? null : <Text style={styles.lock}>✦</Text>}
          </PressableScale>
        ) : null}
      </View>

      {onToday ? null : (
        <PressableScale
          onPress={() => {
            void loadDeck(todayDateKey());
          }}
          style={styles.todayPill}
          accessibilityLabel="Back to today"
        >
          <SegmentedText variant="label" style={styles.todayPillLabel}>
            ↩ Today
          </SegmentedText>
        </PressableScale>
      )}

    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bar: {
    // No absolute positioning: FeedTopBar lays this out in a row beside the
    // intel chip, which is what stops the two overlapping on a phone.
    alignItems: 'center',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.glass,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    borderColor: palette.accent,
    backgroundColor: palette.accentDim,
  },
  glyph: {
    fontSize: 13,
    lineHeight: 16,
  },
  label: {
    color: palette.textSecondary,
  },
  labelActive: {
    color: palette.accent,
  },
  lock: {
    color: palette.accent,
    fontSize: 11,
  },
  todayPill: {
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  todayPillLabel: {
    color: palette.void,
  },
});
