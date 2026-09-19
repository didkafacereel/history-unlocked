import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { shortDateKeyLabel } from '@/lib/dateKey';
import { isTallyUnknown, VOTE_THRESHOLD } from '@/services/voting';
import { useIsPro } from '@/stores/useEntitlementStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { useVoteStore } from '@/stores/useVoteStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { HistoricalEvent } from '@/types/manifest';

/**
 * The ballot: which of the day's events mattered most.
 *
 * A single screen listing the whole day, rather than a vote button on each
 * card. On the cards, the lead is seen first and would collect votes for being
 * first — the result would measure position, not preference. Here every event
 * gets the same exposure at the moment of choosing.
 *
 * Counts stay hidden until you have voted, because showing them first is how
 * you get the answer you already displayed.
 */
export const ReadersChoiceCard = memo(function ReadersChoiceCard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isPro = useIsPro();
  const dateKey = useFeedStore((s) => s.dateKey);
  const dayEvents = useFeedStore((s) => s.dayEvents);
  const tally = useVoteStore((s) => s.tally);
  const load = useVoteStore((s) => s.load);
  const cast = useVoteStore((s) => s.cast);

  useEffect(() => {
    if (dateKey && isPro) {
      void load(dateKey);
    }
  }, [dateKey, isPro, load]);

  if (!dateKey) {
    return null;
  }

  const mine = tally?.dateKey === dateKey ? tally : null;
  const voted = mine?.myVote ?? null;
  const unknown = mine !== null && isTallyUnknown(mine);
  const total = mine && !unknown ? mine.total : 0;
  const showResults = voted !== null && total >= VOTE_THRESHOLD;

  const chronological = dayEvents.slice().sort((a, b) => a.year - b.year);

  return (
    <View style={styles.card}>
      <LinearGradient colors={[palette.void, palette.ink, '#101A16']} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SegmentedText variant="label" style={styles.kicker}>
          {`Readers’ choice · ${shortDateKeyLabel(dateKey)}`}
        </SegmentedText>

        {!isPro ? (
          <Locked onPress={() => router.push('/paywall')} />
        ) : (
          <>
            <Text style={styles.headline}>
              {voted
                ? showResults
                  ? `${total} readers voted`
                  : 'Your vote is in'
                : `Which of today’s ${chronological.length} mattered most?`}
            </Text>

            {voted && !showResults ? (
              <SegmentedText variant="caption" style={styles.note}>
                {unknown
                  ? 'Counted once you are back online.'
                  : `${total} of ${VOTE_THRESHOLD} votes so far. A handful is not a verdict — results appear at ${VOTE_THRESHOLD}.`}
              </SegmentedText>
            ) : !voted ? (
              <SegmentedText variant="caption" style={styles.note}>
                Counts stay hidden until you pick. One vote, changeable any time.
              </SegmentedText>
            ) : null}

            <View style={styles.list}>
              {chronological.map((event) => (
                <BallotRow
                  key={event.id}
                  event={event}
                  mine={voted === event.id}
                  share={
                    showResults && total > 0 ? (mine?.byEvent[event.id] ?? 0) / total : null
                  }
                  onPress={() => {
                    void cast(dateKey, event.id);
                  }}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
});

const Locked = memo(function Locked({ onPress }: { onPress: () => void }) {
  return (
    <View style={styles.locked}>
      <Text style={styles.lockGlyph}>🗳️</Text>
      <Text style={styles.headline}>Readers pick the day’s standout</Text>
      <SegmentedText variant="caption" style={styles.note}>
        Pro readers vote on which event mattered most. The winner is marked on the
        card for everyone.
      </SegmentedText>
      <PressableScale onPress={onPress} style={styles.cta} accessibilityLabel="Unlock voting with Pro">
        <SegmentedText variant="label" style={styles.ctaLabel}>
          ✦ Open with Pro
        </SegmentedText>
      </PressableScale>
    </View>
  );
});

interface BallotRowProps {
  event: HistoricalEvent;
  mine: boolean;
  /** 0-1 once results are showable, else null. */
  share: number | null;
  onPress: () => void;
}

const BallotRow = memo(function BallotRow({ event, mine, share, onPress }: BallotRowProps) {
  const year = event.year < 0 ? `${Math.abs(event.year)} BCE` : String(event.year);
  const percent = share !== null ? Math.round(share * 100) : null;

  return (
    <PressableScale
      onPress={onPress}
      style={mine ? { ...styles.row, ...styles.rowMine } : styles.row}
      accessibilityLabel={
        mine ? `Your vote: ${event.title}` : `Vote for ${event.title}, ${year}`
      }
    >
      <View style={styles.rowHead}>
        <Text style={mine ? styles.yearMine : styles.year}>{year}</Text>
        {percent !== null ? (
          <Text style={mine ? styles.percentMine : styles.percent}>{`${percent}%`}</Text>
        ) : null}
      </View>
      <SegmentedText variant="fact" style={mine ? styles.titleMine : styles.title}>
        {event.title}
      </SegmentedText>
      {share !== null ? (
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              mine ? styles.fillMine : null,
              { width: `${Math.max(share * 100, share > 0 ? 2 : 0)}%` },
            ]}
          />
        </View>
      ) : null}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  kicker: {
    color: palette.correct,
  },
  headline: {
    ...type.headline,
    fontSize: 22,
    lineHeight: 27,
  },
  note: {
    color: palette.textTertiary,
  },
  list: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  row: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  rowMine: {
    borderColor: palette.correct,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  year: {
    ...type.label,
    color: palette.accent,
  },
  yearMine: {
    ...type.label,
    color: palette.correct,
  },
  percent: {
    ...type.label,
    color: palette.textTertiary,
  },
  percentMine: {
    ...type.label,
    color: palette.correct,
  },
  title: {
    color: palette.textPrimary,
  },
  titleMine: {
    color: palette.textPrimary,
  },
  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: palette.glass,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: palette.textTertiary,
  },
  fillMine: {
    backgroundColor: palette.correct,
  },
  locked: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xxl,
  },
  lockGlyph: {
    fontSize: 44,
  },
  cta: {
    marginTop: spacing.sm,
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg - 2,
  },
  ctaLabel: {
    color: palette.void,
  },
});
