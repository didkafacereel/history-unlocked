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
            {/* The word only when it is carrying information. Unfiltered, this
                chip said "FILTER" beside a chip saying "TODAY" and the pair
                needed 231pt of a 360dp phone's 205pt slot — the overflow is
                what put TODAY on top of the rank. Filtered, the category name
                is the whole point of the chip and it stays. */}
            {category ? (
              <SegmentedText variant="label" style={styles.labelActive}>
                {category.split(' ')[0] ?? 'Filter'}
              </SegmentedText>
            ) : null}
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
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
    // The safety net, for the case the trimming above does not cover: a long
    // category name ("Exploration") makes this chip wide enough to overrun the
    // slot again. Wrapping drops it onto a second line, right-aligned — two
    // short lines of chrome, never a collision.
    flexWrap: 'wrap',
    gap: spacing.sm,
    // Shrinkable all the way down: FeedTopBar gives this group whatever the
    // back button and intel chip leave, and on a 360dp phone that is less than
    // both chips want. Shrinking makes the labels ellipsise; not shrinking
    // makes them overflow the screen, which is how "TODAY" ended up printed
    // over the rank in the first place.
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  bar: {
    // No absolute positioning: FeedTopBar lays this out in a row beside the
    // intel chip, which is what stops the two overlapping on a phone.
    //
    // `alignSelf: stretch` so this takes the width FeedTopBar's right-hand
    // group was given instead of sizing to its own content. Sized to content
    // it stayed 231pt wide inside a 205pt slot and the Filter chip hung off
    // the right edge of a 360dp screen — the chips below can only shrink if
    // something above them is actually narrower than they are.
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    gap: spacing.sm,
    minWidth: 0,
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
    flexShrink: 1,
    minWidth: 0,
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
    flexShrink: 1,
  },
  labelActive: {
    color: palette.accent,
    flexShrink: 1,
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
