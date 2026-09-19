import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventDetailSheet } from '@/components/event-detail/EventDetailSheet';
import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { SearchResultRow } from '@/components/search/SearchResultRow';
import { searchArchive, SearchHit } from '@/data/search';
import { goBack } from '@/lib/goBack';
import { useEntitlementStore } from '@/stores/useEntitlementStore';
import { useEventDetailStore } from '@/stores/useEventDetailStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { HistoricalEvent } from '@/types/manifest';

/**
 * Search the whole archive.
 *
 * Pro, for the same reason the Time Machine is: this is access to every date at
 * once, and the free tier is deliberately today-shaped. A free reader who could
 * search would be handed the archive through the back door.
 *
 * Debounced rather than search-on-submit — the index is local, so results
 * arriving as you type costs nothing and reads as instant.
 */
const DEBOUNCE_MS = 180;
/** Below this a query matches half the archive and means nothing. */
const MIN_TERM = 2;

export default function SearchRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isPro = useEntitlementStore((s) => s.isPro);
  const openDetail = useEventDetailStore((s) => s.open);

  const [query, setQuery] = useState('');
  // The result is stored WITH the term it answers, so "is this stale?" is a
  // comparison rather than a second piece of state — and the effect never has
  // to call setState synchronously to clear it, which React now forbids.
  const [result, setResult] = useState<{ term: string; hits: SearchHit[] }>({
    term: '',
    hits: [],
  });
  const runId = useRef(0);

  useEffect(() => {
    if (!isPro) {
      router.replace('/paywall');
    }
  }, [isPro, router]);

  const term = query.trim();

  useEffect(() => {
    if (term.length < MIN_TERM) {
      return;
    }
    const id = ++runId.current;
    const timer = setTimeout(() => {
      void searchArchive(term).then((hits) => {
        // A slower earlier query must not overwrite a faster later one.
        if (runId.current === id) {
          setResult({ term, hits });
        }
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term]);

  const onOpen = useCallback(
    (event: HistoricalEvent) => {
      openDetail(event);
    },
    [openDetail],
  );

  const settled = result.term === term;
  const hits = settled ? result.hits : [];
  const searching = term.length >= MIN_TERM && !settled;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <PressableScale
          onPress={() => goBack(router)}
          style={styles.back}
          accessibilityLabel="Back"
        >
          <Text style={styles.backGlyph}>‹</Text>
        </PressableScale>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search every date…"
          placeholderTextColor={palette.textTertiary}
          style={styles.input}
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Search the archive"
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {term.length < MIN_TERM ? (
          <View style={styles.hint}>
            <Text style={styles.hintGlyph}>🔎</Text>
            <SegmentedText variant="caption" style={styles.hintText}>
              Search by person, place, war or year — across every day of the archive.
            </SegmentedText>
          </View>
        ) : searching && hits.length === 0 ? (
          <ActivityIndicator color={palette.accent} style={styles.spinner} />
        ) : hits.length === 0 ? (
          <View style={styles.hint}>
            <SegmentedText variant="caption" style={styles.hintText}>
              {`Nothing in the archive matches “${term}”.`}
            </SegmentedText>
          </View>
        ) : (
          <>
            <SegmentedText variant="label" style={styles.count}>
              {`${hits.length}${hits.length === 40 ? '+' : ''} results`}
            </SegmentedText>
            {hits.map((hit) => (
              <SearchResultRow key={hit.event.id} event={hit.event} onPress={onOpen} />
            ))}
          </>
        )}
      </ScrollView>

      <EventDetailSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.inkRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    color: palette.textPrimary,
    fontSize: 24,
    lineHeight: 28,
  },
  input: {
    flex: 1,
    ...type.fact,
    color: palette.textPrimary,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  count: {
    marginBottom: spacing.xs,
  },
  hint: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xxxl,
  },
  hintGlyph: {
    fontSize: 40,
  },
  hintText: {
    textAlign: 'center',
    maxWidth: 280,
  },
  spinner: {
    marginTop: spacing.xxl,
  },
});
