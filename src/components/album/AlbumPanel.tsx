import { useRouter } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { ALBUM_MAX, ALBUM_MIN, useAlbumCount } from '@/stores/useAlbumStore';
import { useKeptCount } from '@/stores/useFavouritesStore';
import { useFoundersStore } from '@/stores/useFoundersStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * Profile entry to the album.
 *
 * The panel does not appear at all until the reader has kept something. An
 * empty collection advertised on the profile is a chore assigned by the app;
 * the same panel arriving the moment they keep their first event is a reward
 * for a thing they just chose to do.
 */
export const AlbumPanel = memo(function AlbumPanel() {
  const router = useRouter();
  const kept = useKeptCount();
  const chosen = useAlbumCount();
  const seat = useFoundersStore((s) => s.status.seat);
  const displayName = useFoundersStore((s) => s.status.displayName);

  if (kept === 0) {
    return null;
  }

  const named = seat !== null && displayName;

  return (
    <View style={styles.panel}>
      <SegmentedText variant="label">{named ? `The ${displayName} Album` : 'Your album'}</SegmentedText>

      <View style={styles.readout}>
        <Text style={styles.count}>{chosen}</Text>
        <SegmentedText variant="caption" style={styles.of}>
          {chosen === 0
            ? `chosen — pick ${ALBUM_MIN} to ${ALBUM_MAX} from the ${kept} you kept`
            : chosen < ALBUM_MIN
              ? `of ${ALBUM_MAX} · ${ALBUM_MIN - chosen} more makes it a collection`
              : `of ${ALBUM_MAX} · from ${kept} kept`}
        </SegmentedText>
      </View>

      {/* Said only to someone who is not a founder, and only once they have
          something to lose by not being one. */}
      {seat === null ? (
        <SegmentedText variant="caption">
          A Founder’s album carries their name at the top of it.
        </SegmentedText>
      ) : null}

      <PressableScale
        onPress={() => router.push('/album')}
        style={styles.cta}
        accessibilityLabel="Open your album"
      >
        <SegmentedText variant="label" style={styles.ctaLabel}>
          {chosen === 0 ? 'Choose your events' : 'Open the album'}
        </SegmentedText>
      </PressableScale>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  readout: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  count: {
    ...type.yearDisplay,
    color: palette.accent,
    flexShrink: 0,
  },
  of: {
    flexShrink: 1,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  ctaLabel: {
    color: palette.void,
  },
});
