import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DetailFactRow } from '@/components/event-detail/DetailFactRow';
import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { ShareEventButton } from '@/components/share/ShareEventButton';
import { loadEventsByIds } from '@/data/ingestion';
import { shortDateKeyLabel } from '@/lib/dateKey';
import { useFeedStore } from '@/stores/useFeedStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { HistoricalEvent } from '@/types/manifest';

/**
 * The landing page for a shared event — `/e/{id}`, reached from a share card,
 * a link in a message, or the `historyunlocked://` scheme.
 *
 * Deliberately standalone: it resolves the event straight from the manifest by
 * id and needs no loaded deck, because whoever opens this link is usually
 * arriving cold and may not have opened the app today at all. The way onward is
 * a single button that loads the whole day — that is the conversion, not a
 * paywall.
 */
export default function SharedEventRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<HistoricalEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void loadEventsByIds(id ? [id] : []).then(([found]) => {
      if (!active) {
        return;
      }
      setEvent(found ?? null);
      setLoading(false);
      if (found) {
        // Arriving through a link counts as reading it — otherwise the feed
        // would serve the same event again as "new" the next time it opens.
        useLibraryStore.getState().markSeen(found.id);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  const openDay = () => {
    if (event) {
      void useFeedStore.getState().loadDeck(event.dateKey);
    }
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centered}>
        <Text style={type.headline}>Not in the archive</Text>
        <SegmentedText variant="caption" style={styles.centeredText}>
          This link points at an event this copy of the archive doesn’t hold.
        </SegmentedText>
        <PressableScale
          onPress={() => router.replace('/')}
          style={styles.cta}
          accessibilityLabel="Go to today"
        >
          <SegmentedText variant="label" style={styles.ctaLabel}>
            Go to today
          </SegmentedText>
        </PressableScale>
      </View>
    );
  }

  const yearLabel = event.year < 0 ? `${Math.abs(event.year)} BCE` : String(event.year);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <SegmentedText variant="label" style={styles.kicker}>
        {`${shortDateKeyLabel(event.dateKey)} · ${event.era}`}
      </SegmentedText>
      <Text style={styles.year}>{yearLabel}</Text>
      <Text style={styles.title}>{event.title}</Text>

      <View style={styles.facts}>
        {event.facts.map((fact) => (
          <DetailFactRow key={fact.id} icon={fact.icon} text={fact.text} />
        ))}
      </View>

      {event.summary ? (
        <View style={styles.storyBlock}>
          <SegmentedText variant="label">The story</SegmentedText>
          <Text style={styles.story}>{event.summary}</Text>
        </View>
      ) : null}

      <PressableScale
        onPress={openDay}
        style={styles.cta}
        accessibilityLabel={`See everything else recorded on ${shortDateKeyLabel(event.dateKey)}`}
      >
        <SegmentedText variant="label" style={styles.ctaLabel}>
          {`See all of ${shortDateKeyLabel(event.dateKey)} →`}
        </SegmentedText>
      </PressableScale>

      <ShareEventButton event={event} />

      {event.imageCredit || event.textCredit ? (
        <SegmentedText variant="caption" style={styles.credit}>
          {[event.imageCredit, event.textCredit].filter(Boolean).join('   ·   ')}
        </SegmentedText>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    backgroundColor: palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  centeredText: {
    textAlign: 'center',
    maxWidth: 300,
  },
  kicker: {
    color: palette.accent,
  },
  year: {
    ...type.yearDisplay,
  },
  title: {
    ...type.headline,
  },
  facts: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  storyBlock: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  story: {
    ...type.fact,
    color: palette.textSecondary,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: spacing.lg,
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  ctaLabel: {
    color: palette.void,
  },
  credit: {
    marginTop: spacing.lg,
  },
});
