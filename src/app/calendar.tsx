import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarMonthGrid } from '@/components/calendar/CalendarMonthGrid';
import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { loadCoveredDateKeys } from '@/data/ingestion';
import { FREE_TIME_MACHINE_DAYS, freeReachableDateKeys } from '@/data/timeMachine';
import { goBack } from '@/lib/goBack';
import { makeDateKey, parseDateKey, todayDateKey } from '@/lib/dateKey';
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
    void loadCoveredDateKeys().then(setCoveredKeys);
  }, []);

  /*
   * A week of catching up, free.
   *
   * This screen used to bounce anyone without Pro straight to the paywall, and
   * the cost of that was quiet: a free reader who missed Thursday lost
   * Thursday until the following year. The streak asks them to come every day
   * and then punished the first day they missed; every reminder they did not
   * tap became a notification about an event they could no longer open.
   *
   * The depth wall still applies, so a free reader on a past date sees the
   * same three events they would have seen on the day. Seven days times three
   * is not a substitute for Pro — it is the difference between missing a day
   * and losing it.
   */
  const reachable = useMemo(() => (isPro ? null : freeReachableDateKeys()), [isPro]);

  const lockedDays = useMemo(() => {
    if (!reachable) {
      return undefined;
    }
    const days = new Set<number>();
    for (let day = 1; day <= 31; day += 1) {
      if (!reachable.has(makeDateKey(month, day))) {
        days.add(day);
      }
    }
    return days;
  }, [reachable, month]);

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
    if (reachable && !reachable.has(dateKey)) {
      // The tap is the explanation. A day that simply does not respond teaches
      // the reader that the screen is broken, not that the day is worth buying.
      router.push('/paywall');
      return;
    }
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
          {/* flexShrink, or the title runs off the edge and takes the close
              button with it — "Catch up on a day you missed" is longer than
              the old "Pick any day in history" and a row that sizes to
              content has no way to know that. */}
          <View style={styles.headerText}>
            <SegmentedText variant="label" style={styles.kicker}>
              {isPro ? '✦ Time Machine' : `✦ The last ${FREE_TIME_MACHINE_DAYS} days`}
            </SegmentedText>
            <Text style={styles.title}>
              {isPro ? 'Pick any day in history' : 'Catch up on a day you missed'}
            </Text>
          </View>
          <PressableScale onPress={() => goBack(router)} style={styles.close} accessibilityLabel="Close">
            <Text style={styles.closeGlyph}>✕</Text>
          </PressableScale>
        </View>

        <CalendarMonthGrid
          month={month}
          coveredDays={coveredDays}
          todayDay={month === today.month ? today.day : null}
          lockedDays={lockedDays}
          onPrevMonth={() => cycleMonth(-1)}
          onNextMonth={() => cycleMonth(1)}
          onSelect={onSelect}
        />

        {/* The accent means two different things depending on who is looking:
            "the archive covers this day" for Pro, and "you can open this day"
            for everyone else. The legend says whichever one is true. */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.swatchCovered]} />
            <SegmentedText variant="caption">{isPro ? 'Events archived' : 'Open'}</SegmentedText>
          </View>
          {isPro ? null : (
            <View style={styles.legendItem}>
              <View style={[styles.swatch, styles.swatchLocked]} />
              <SegmentedText variant="caption">Needs Pro</SegmentedText>
            </View>
          )}
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.swatchToday]} />
            <SegmentedText variant="caption">Today</SegmentedText>
          </View>
        </View>

        {isPro ? null : (
          <Text style={styles.freeNote}>
            {`The last ${FREE_TIME_MACHINE_DAYS} days are open, with three events each — the same three the day itself would have shown. Pro opens every date of the year, in full.`}
          </Text>
        )}

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
    gap: spacing.md,
  },
  headerText: {
    flexShrink: 1,
    minWidth: 0,
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
  swatchLocked: {
    backgroundColor: palette.inkRaised,
    borderColor: palette.glassBorder,
    opacity: 0.55,
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
  // Plain Text: the caption variant caps at two lines and this needs three to
  // say what is open and what is not without being vague about either.
  freeNote: {
    ...type.caption,
    textAlign: 'center',
  },
});
