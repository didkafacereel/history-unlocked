import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlbumEventRow } from '@/components/album/AlbumEventRow';
import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { loadEventsByIds } from '@/data/ingestion';
import { goBack } from '@/lib/goBack';
import { ALBUM_MAX, ALBUM_MIN, useAlbumStore } from '@/stores/useAlbumStore';
import { keptIdsNewestFirst, useFavouritesStore } from '@/stores/useFavouritesStore';
import { useFoundersStore } from '@/stores/useFoundersStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { HistoricalEvent } from '@/types/manifest';

/**
 * The Founder's Album — a handful of events, chosen by hand, under a name.
 *
 * Why this and not another collection: the Museum is editorial, the library is
 * automatic, and neither is the reader's. This is the only thing in the app
 * that is authored BY them, which is also why it belongs to the lifetime tier —
 * an album you built over a year is the single most expensive thing to walk
 * away from, and that is what a lifetime plan has to be worth.
 *
 * Keeping events is free for everyone. Only the named album is the perk, so a
 * reader who pays on their two-hundredth day already has something to put in it.
 */
export default function AlbumRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const albumIds = useAlbumStore((s) => s.eventIds);
  const add = useAlbumStore((s) => s.add);
  const remove = useAlbumStore((s) => s.remove);
  // `s.kept` is a stable reference; the ordering is derived here. Selecting a
  // freshly-sorted array straight from the store is an infinite render loop.
  const kept = useFavouritesStore((s) => s.kept);
  const keptIds = useMemo(() => keptIdsNewestFirst(kept), [kept]);
  const seat = useFoundersStore((s) => s.status.seat);
  const displayName = useFoundersStore((s) => s.status.displayName);

  const [events, setEvents] = useState<Map<string, HistoricalEvent> | null>(null);

  // Both lists come from the same fetch — the album is a subset of what is
  // kept, so loading them separately would read the archive twice.
  const wanted = [...new Set([...albumIds, ...keptIds])].join(',');
  useEffect(() => {
    let active = true;
    const ids = wanted.length > 0 ? wanted.split(',') : [];
    loadEventsByIds(ids)
      .then((loaded) => {
        if (active) {
          setEvents(new Map(loaded.map((e) => [e.id, e])));
        }
      })
      .catch(() => {
        // Resolving the manifest can reject — offline with no cache. An empty
        // map renders the same empty album that `null` already did, so nothing
        // moves on screen; what changes is that the rejection is handled rather
        // than left unhandled, which in a release build is silent.
        if (active) {
          setEvents(new Map());
        }
      });
    return () => {
      active = false;
    };
  }, [wanted]);

  const inAlbum = albumIds
    .map((id) => events?.get(id))
    .filter((e): e is HistoricalEvent => e !== undefined);
  const candidates = keptIds
    .filter((id) => !albumIds.includes(id))
    .map((id) => events?.get(id))
    .filter((e): e is HistoricalEvent => e !== undefined);

  const full = albumIds.length >= ALBUM_MAX;
  const title = seat !== null && displayName ? `The ${displayName} Album` : 'Your album';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <PressableScale
        onPress={() => goBack(router)}
        style={styles.back}
        accessibilityLabel="Back"
      >
        <Text style={styles.backGlyph}>‹</Text>
      </PressableScale>

      <View style={styles.header}>
        <SegmentedText variant="label" style={styles.kicker}>
          {seat !== null ? `✦ Founder ${seat}` : '✦ Album'}
        </SegmentedText>
        <Text style={styles.title}>{title}</Text>
        <SegmentedText variant="caption">
          {albumIds.length === 0
            ? `Choose between ${ALBUM_MIN} and ${ALBUM_MAX} of the events you kept. Not everything you liked — the ones you would show someone.`
            : `${albumIds.length} of ${ALBUM_MAX} chosen${
                albumIds.length < ALBUM_MIN ? ` · ${ALBUM_MIN - albumIds.length} more to make a collection` : ''
              }`}
        </SegmentedText>
      </View>

      {/* A founder with no name yet keeps the album, but it cannot carry a
          title — the name comes from the day they claimed, and asking for it
          twice would mean two answers that can disagree. */}
      {seat !== null && !displayName ? (
        <View style={styles.notice}>
          <SegmentedText variant="caption">
            Claim your day in the profile and your name goes on this album too.
          </SegmentedText>
        </View>
      ) : null}

      {events === null ? (
        <ActivityIndicator color={palette.accent} />
      ) : (
        <>
          {inAlbum.length > 0 ? (
            <View style={styles.group}>
              {inAlbum.map((event, index) => (
                <AlbumEventRow
                  key={event.id}
                  event={event}
                  position={index + 1}
                  actionLabel="Remove"
                  actionAccessibilityLabel={`Remove ${event.title} from the album`}
                  onAction={() => remove(event.id)}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.group}>
            <SegmentedText variant="label">
              {candidates.length > 0 ? `Kept events · ${candidates.length}` : 'Kept events'}
            </SegmentedText>
            {candidates.length === 0 ? (
              // "Nothing kept yet" would be untrue for a reader whose every
              // kept event is already in the album — they kept things, and
              // being told otherwise reads as the app having lost them.
              <SegmentedText variant="caption">
                {keptIds.length === 0
                  ? 'Nothing kept yet. Tap ☆ Keep on any card in the feed and it lands here.'
                  : 'Everything you have kept is in the album. Keep more from the feed to choose between them.'}
              </SegmentedText>
            ) : (
              candidates.map((event) => (
                <AlbumEventRow
                  key={event.id}
                  event={event}
                  actionLabel={full ? 'Full' : 'Add'}
                  actionAccessibilityLabel={
                    full
                      ? `The album is full at ${ALBUM_MAX}`
                      : `Add ${event.title} to the album`
                  }
                  actionDisabled={full}
                  onAction={() => add(event.id)}
                />
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
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
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.inkRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    color: palette.textSecondary,
    fontSize: 22,
    lineHeight: 24,
  },
  header: {
    gap: spacing.sm,
  },
  kicker: {
    color: palette.accent,
  },
  title: {
    ...type.headline,
  },
  notice: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: palette.inkRaised,
    borderLeftWidth: 3,
    borderLeftColor: palette.accent,
  },
  group: {
    gap: spacing.sm,
  },
});
