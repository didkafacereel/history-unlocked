import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StyleSheet, Text, View } from 'react-native';

import { ChronosFeedScreen } from '@/components/chronos-feed/ChronosFeedScreen';
import { LaunchScreen } from '@/components/launch/LaunchScreen';
import { PressableScale } from '@/components/primitives/PressableScale';
import { invalidateManifest } from '@/data/ingestion';
import { todayDateKey } from '@/lib/dateKey';
import { subscribeToReminderTaps } from '@/services/notifications';
import { useIsPro } from '@/stores/useEntitlementStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { useShouldOfferAccount } from '@/stores/useOnboardingStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/** Route shell: hydrate today's deck, then hand off to the feed. */
export default function FeedRoute() {
  const status = useFeedStore((s) => s.status);
  const deckCount = useFeedStore((s) => s.deck.length);
  const deckToken = useFeedStore((s) => s.deckToken);
  const loadDeck = useFeedStore((s) => s.loadDeck);
  const isPro = useIsPro();
  const [retrying, setRetrying] = useState(false);
  const offerAccount = useShouldOfferAccount();
  const [launched, setLaunched] = useState(false);
  /** What "today" meant when this deck was loaded — see the resume effect. */
  const todayWhenLoaded = useRef(todayDateKey());

  // Entitlement is part of the deck plan (it decides the depth wall), so a
  // purchase or restore has to re-plan the day the reader is already on —
  // otherwise Pro is bought and the feed still shows three events.
  useEffect(() => {
    const current = useFeedStore.getState().dateKey;
    void loadDeck(current ?? todayDateKey());
  }, [loadDeck, isPro]);

  // A reader who leaves the app open overnight — or takes it across a date
  // line — came back to yesterday, because the effect above only runs on mount
  // and nothing else watched the clock. Checked on resume rather than by timer:
  // the question is only ever interesting at the moment the app is looked at.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        return;
      }
      const today = todayDateKey();
      const showing = useFeedStore.getState().dateKey;
      // Only a reader sitting on TODAY is moved forward. Someone who walked
      // back to 3 June through the Time Machine stays on 3 June — which is why
      // this compares against the date that WAS today when the deck loaded,
      // not against the deck's date alone.
      if (showing !== today && showing === todayWhenLoaded.current) {
        todayWhenLoaded.current = today;
        void loadDeck(today);
      }
    });
    return () => subscription.remove();
  }, [loadDeck]);

  // The scheduled reminder has always carried the date it fired for; until now
  // nothing read it, so a reminder tapped after midnight opened the wrong day.
  useEffect(() => subscribeToReminderTaps((dateKey) => void loadDeck(dateKey)), [loadDeck]);

  const retry = useCallback(async () => {
    setRetrying(true);
    invalidateManifest();
    await loadDeck(useFeedStore.getState().dateKey ?? todayDateKey());
    setRetrying(false);
  }, [loadDeck]);

  if (status === 'error' || (status === 'ready' && deckCount === 0)) {
    // One screen for both, because the reader's situation is the same either
    // way: the archive did not arrive. The Zod message that used to be printed
    // here told them nothing and named our internals.
    return (
      <View style={styles.fallback}>
        <Text style={[type.headline, styles.centered]}>Today didn’t arrive</Text>
        <Text style={[type.caption, styles.centered]}>
          The archive couldn’t be reached. Check your connection and try again.
        </Text>
        <PressableScale onPress={() => void retry()} style={styles.retry} accessibilityLabel="Try again">
          {retrying ? (
            <ActivityIndicator color={palette.void} />
          ) : (
            <Text style={styles.retryLabel}>Try again</Text>
          )}
        </PressableScale>
      </View>
    );
  }

  // The app opens here, every launch: the brand while the archive downloads —
  // 16 MB and 8056 events through Zod, which is seconds on a phone — and then
  // the ways into the day. `launched` is component state, not persisted, so
  // this is a screen per launch rather than a screen once ever.
  if (status !== 'ready' || !launched) {
    return (
      <LaunchScreen
        ready={status === 'ready'}
        offerAccount={offerAccount}
        onContinue={() => setLaunched(true)}
      />
    );
  }

  // Keyed on the deck token: a new day is a new gesture surface. `scrollY`
  // lives on the UI thread with no reset path, so remounting is both the
  // simplest and the only lint-clean way to open on a different card.
  return <ChronosFeedScreen key={deckToken} />;
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: palette.void,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  centered: {
    textAlign: 'center',
  },
  retry: {
    marginTop: spacing.sm,
    minWidth: 160,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
  },
  retryLabel: {
    ...type.label,
    color: palette.void,
    fontWeight: '700',
  },
});
