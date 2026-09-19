import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarMonthGrid } from '@/components/calendar/CalendarMonthGrid';
import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { loadCoveredDateKeys } from '@/data/ingestion';
import { goBack } from '@/lib/goBack';
import { parseDateKey, todayDateKey } from '@/lib/dateKey';
import { useEntitlementStore } from '@/stores/useEntitlementStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * Time Machine — the Pro calendar. Pick any calendar day and the feed loads
 * that day's events across all of history. Reached only by Pro users (the feed
 * entry routes free users to the paywall); a defensive redirect covers deep links.
 */
export default function CalendarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isPro = useEntitlementStore((s) => s.isPro);
  const loadDeck = useFeedStore((s) => s.loadDeck);

  const today = useMemo(() => parseDateKey(todayDateKey()), []);
  const [month, setMonth] = useState(today.month);
  const [coveredKeys, setCoveredKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!isPro) {
      router.replace('/paywall');
    }
  }, [isPro, router]);

  useEffect(() => {
    void loadCoveredDateKeys().then(setCoveredKeys);
  }, []);

  // Days in the visible month that the archive covers.
  const coveredDays = useMemo(() => {
    const days = new Set<number>();
    for (const key of coveredKeys) {
      const { month: m, day } = parseDateKey(key);
      if (m === month) {
        days.add(day);
      }
    }
    return days;
  }, [coveredKeys, month]);

  const onSelect = (dateKey: string) => {
    void loadDeck(dateKey);
    // Deep-linked openings have nothing behind them; `goBack` sends those to
    // the feed instead of sitting on a calendar that looks like it ignored the tap.
    goBack(router);
  };

  const cycleMonth = (delta: number) => setMonth((m) => ((m - 1 + delta + 12) % 12) + 1);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <SegmentedText variant="label" style={styles.kicker}>
              ✦ Time Machine
            </SegmentedText>
            <Text style={styles.title}>Pick any day in history</Text>
          </View>
          <PressableScale onPress={() => goBack(router)} style={styles.close} accessibilityLabel="Close">
            <Text style={styles.closeGlyph}>✕</Text>
          </PressableScale>
        </View>

        <CalendarMonthGrid
          month={month}
          coveredDays={coveredDays}
          todayDay={month === today.month ? today.day : null}
          onPrevMonth={() => cycleMonth(-1)}
          onNextMonth={() => cycleMonth(1)}
          onSelect={onSelect}
        />

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.swatchCovered]} />
            <SegmentedText variant="caption">Events archived</SegmentedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.swatchToday]} />
            <SegmentedText variant="caption">Today</SegmentedText>
          </View>
        </View>

        <PressableScale
          onPress={() => onSelect(todayDateKey())}
          style={styles.todayButton}
          accessibilityLabel="Jump to today"
        >
          <SegmentedText variant="label" style={styles.todayLabel}>
            Back to today
          </SegmentedText>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.void,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  kicker: {
    color: palette.accent,
  },
  title: {
    ...type.headline,
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.inkRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    color: palette.textSecondary,
    fontSize: 16,
    lineHeight: 18,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  swatchCovered: {
    backgroundColor: palette.accentDim,
    borderColor: palette.accent,
  },
  swatchToday: {
    backgroundColor: palette.inkRaised,
    borderColor: palette.textPrimary,
    borderWidth: 2,
  },
  todayButton: {
    alignSelf: 'center',
    backgroundColor: palette.inkRaised,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  todayLabel: {
    color: palette.textSecondary,
  },
});
