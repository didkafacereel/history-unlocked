import { useVideoPlayer, VideoView } from 'expo-video';
import { memo, useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import type { DayFilm } from '@/data/films';
import { useFilmStore } from '@/stores/useFilmStore';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * The day's film, full screen.
 *
 * A SIBLING of the deck, like every sheet (the overlay rule), opened through
 * `useFilmStore`. Mounts only while a film is playing, so the player — and the
 * native decoder behind it — exists only then; closing releases both.
 *
 * The films are 9:16 like the phone, so `contain` fills the screen on most
 * handsets and letterboxes on the rest rather than cropping the captions.
 */
export const FilmPlayerSheet = memo(function FilmPlayerSheet() {
  const film = useFilmStore((s) => s.playing);
  if (!film) {
    return null;
  }
  // Keyed on the video: a different film is a different player.
  return <FilmPlayer key={film.videoUrl} film={film} />;
});

function FilmPlayer({ film }: { film: DayFilm }) {
  const close = useFilmStore((s) => s.close);
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(film.videoUrl, (p) => {
    p.loop = false;
    p.play();
  });

  // Android's back button closes the film, not the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [close]);

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.stage}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
        fullscreenOptions={{ enable: false }}
      />
      <View style={[styles.bar, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <PressableScale onPress={close} style={styles.close} accessibilityLabel="Close the film">
          <SegmentedText variant="label">✕ Close</SegmentedText>
        </PressableScale>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.void,
  },
  video: {
    flex: 1,
  },
  bar: {
    position: 'absolute',
    right: spacing.lg,
  },
  close: {
    backgroundColor: palette.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
});
