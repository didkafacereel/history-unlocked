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
  /**
   * Four states, not two, and the fourth is the one that was missing.
   *
   * `loadEventsByIds` resolves the manifest, and this screen had no `.catch`,
   * so a rejection would leave `loading` true for good: a spinner with no text
   * and no way out. Worse here than anywhere else, because a shared link is
   * opened cold, the back stack is empty, and hardware back leaves the app.
   *
   * How likely is that? Less than it looks, and the honest answer is worth
   * writing down: `fetchRemoteManifest` catches everything and returns null,
   * `readManifestCache` the same, and the last fallback is the BUNDLED fixture,
   * which only throws if it fails its own schema — and `validate:manifest`
   * gates that on every build. So this is defence in depth rather than a bug
   * anybody will meet. It is here because `loadArchiveStats` already guards the
   * same call, one unguarded caller is how the guarantee quietly stops being
   * one, and a spinner is the worst possible way to find out.
   *
   * "Could not reach it" and "not in the archive" also need different words.
   * Telling an offline reader the event does not exist is a lie they may act on
   * by not trying again.
   */
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    // No `setStatus('loading')` here: setting state directly in an effect body
    // is what `react-hooks/set-state-in-effect` forbids, and the retry button
    // is a better place for it anyway — it is the event that means "try again".
    loadEventsByIds(id ? [id] : [])
      .then(([found]) => {
        if (!active) {
          return;
        }
        setEvent(found ?? null);
        setStatus('ready');
        if (found) {
          // Arriving through a link counts as reading it — otherwise the feed
          // would serve the same event again as "new" the next time it opens.
          useLibraryStore.getState().markSeen(found.id);
        }
      })
      .catch(() => {
        if (active) {
          setEvent(null);
          setStatus('failed');
        }
      });
    return () => {
      active = false;
    };
  }, [id, attempt]);

  const openDay = () => {
    if (event) {
      void useFeedStore.getState().loadDeck(event.dateKey);
    }
    router.replace('/');
  };

  if (status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  if (status === 'failed') {
    return (
      <View style={styles.centered}>
        <Text style={type.headline}>Couldn’t reach the archive</Text>
        <SegmentedText variant="caption" style={styles.centeredText}>
          This link needs the archive, and it couldn’t be downloaded. Check your connection.
        </SegmentedText>
        <PressableScale
          onPress={() => {
            setStatus('loading');
            setAttempt((n) => n + 1);
          }}
          style={styles.cta}
          accessibilityLabel="Try again"
        >
          <SegmentedText variant="label" style={styles.ctaLabel}>
            Try again
          </SegmentedText>
        </PressableScale>
        {/* A second way out, because this screen is usually opened cold: the
            back stack is empty and hardware back leaves the app. */}
        <PressableScale
          onPress={() => router.replace('/')}
          style={styles.ghost}
          accessibilityLabel="Go to today"
        >
          <SegmentedText variant="label">Go to today</SegmentedText>
        </PressableScale>
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
  ghost: {
    alignSelf: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  credit: {
    marginTop: spacing.lg,
  },
});
