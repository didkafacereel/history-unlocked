import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarMonthGrid } from '@/components/calendar/CalendarMonthGrid';
import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { goBack } from '@/lib/goBack';
import { parseDateKey, shortDateKeyLabel, todayDateKey } from '@/lib/dateKey';
import {
  getFoundersService,
  KEEPER_PLACES,
  KEEPER_REFRESH_NOTE,
} from '@/services/founders';
import { useFoundersStore } from '@/stores/useFoundersStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * The register of days: which of the 366 are spoken for, and by whom.
 *
 * A founders-only screen, and it earns that twice over. Before claiming it is
 * how someone finds a day still free instead of stepping through the picker one
 * date at a time; after claiming it is the thing they bought into — a visible
 * roll of everyone who did the same, with their own day in it.
 *
 * Built on the Time Machine's own month grid rather than a second one. The only
 * difference is what an accented day means, which is why that grid now takes a
 * label for it.
 */
export default function KeepersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const seat = useFoundersStore((s) => s.status.seat);
  const myDate = useFoundersStore((s) => s.status.keptDate);
  // The store opens on seat: null and fills in from the server. Without this
  // the guard below fires on that first null and throws a real founder out to
  // the paywall before their own standing has arrived — which is exactly what
  // happened the first time this screen was opened with a seat in storage.
  const loaded = useFoundersStore((s) => s.loaded);

  const today = useMemo(() => parseDateKey(todayDateKey()), []);
  const [month, setMonth] = useState(today.month);
  const [kept, setKept] = useState<Record<string, string> | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  // Founders only, as a defensive redirect — the entry point is already inside
  // the founder panel, but a deep link has no such gate. Only once the answer
  // is actually known: "not yet" is not "no".
  useEffect(() => {
    if (loaded && seat === null) {
      router.replace({ pathname: '/paywall', params: { plan: 'lifetime' } });
    }
  }, [loaded, seat, router]);

  useEffect(() => {
    let active = true;
    void getFoundersService()
      .keptDates()
      .then((dates) => {
        if (active) {
          setKept(dates);
        }
      })
      .catch(() => {
        if (active) {
          setKept({});
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const keptDays = useMemo(() => {
    const days = new Set<number>();
    for (const dateKey of Object.keys(kept ?? {})) {
      const { month: m, day } = parseDateKey(dateKey);
      if (m === month) {
        days.add(day);
      }
    }
    return days;
  }, [kept, month]);

  const taken = Object.keys(kept ?? {}).length;
  const cycleMonth = (delta: number) => setMonth((m) => ((m - 1 + delta + 12) % 12) + 1);

  const keeperOf = selected === null ? undefined : kept?.[selected];

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
          <View style={styles.headerText}>
            <SegmentedText variant="label" style={styles.kicker}>
              ✦ The register of days
            </SegmentedText>
            <Text style={styles.title}>Who keeps what</Text>
          </View>
          <PressableScale
            onPress={() => goBack(router)}
            style={styles.close}
            accessibilityLabel="Close"
          >
            <Text style={styles.closeGlyph}>✕</Text>
          </PressableScale>
        </View>

        <SegmentedText variant="caption">
          {kept === null
            ? 'Reading the register…'
            : `${taken} of ${KEEPER_PLACES} days taken. ${KEEPER_PLACES - taken} still free.`}
        </SegmentedText>

        <CalendarMonthGrid
          month={month}
          coveredDays={keptDays}
          todayDay={month === today.month ? today.day : null}
          markedLabel="kept"
          onPrevMonth={() => cycleMonth(-1)}
          onNextMonth={() => cycleMonth(1)}
          onSelect={setSelected}
        />

        {/* The answer to the tap sits here rather than in a sheet. The reader
            is scanning a grid and comparing days; a modal over the thing they
            are comparing would have to be dismissed between every two taps. */}
        <View style={styles.answer}>
          {selected === null ? (
            <SegmentedText variant="caption">Tap a day to see who keeps it.</SegmentedText>
          ) : (
            <>
              <Text style={styles.answerDate}>{shortDateKeyLabel(selected)}</Text>
              <SegmentedText variant="fact" style={styles.answerName}>
                {keeperOf === undefined
                  ? 'Nobody keeps this day yet.'
                  : selected === myDate
                    ? `${keeperOf} — this one is yours.`
                    : `Kept by ${keeperOf}`}
              </SegmentedText>
            </>
          )}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.swatch, styles.swatchKept]} />
            <SegmentedText variant="caption">Kept</SegmentedText>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.swatch} />
            <SegmentedText variant="caption">Free</SegmentedText>
          </View>
        </View>

        <SegmentedText variant="caption" style={styles.note}>
          {KEEPER_REFRESH_NOTE}
        </SegmentedText>
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
    gap: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: {
    flexShrink: 1,
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
    flexShrink: 0,
  },
  closeGlyph: {
    color: palette.textSecondary,
    fontSize: 16,
    lineHeight: 18,
  },
  answer: {
    minHeight: 64,
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  answerDate: {
    ...type.label,
    color: palette.accent,
  },
  answerName: {
    color: palette.textPrimary,
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    backgroundColor: palette.inkRaised,
  },
  swatchKept: {
    backgroundColor: palette.accentDim,
    borderColor: palette.accent,
    borderWidth: 1,
  },
  note: {
    textAlign: 'center',
  },
});
