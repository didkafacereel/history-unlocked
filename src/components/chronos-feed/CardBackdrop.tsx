import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { palette } from '@/theme/tokens';

/**
 * Edge-to-edge immersive backdrop: image + scrims that guarantee text contrast
 * over anything the manifest delivers.
 *
 * Two treatments, chosen by the image's own aspect ratio:
 *
 *  - Portrait / squarish art fills the screen (`cover`). A 9:16 crop barely
 *    touches it.
 *  - Landscape art — most historical paintings and press photographs — is
 *    letterboxed into the upper half over a blurred, enlarged copy of itself.
 *    Cover-cropping a 1.4:1 painting into a 0.46:1 screen would show barely a
 *    third of its width, which can cut the actual subject (a ship, a shoreline,
 *    a room of delegates) clean out of frame. Showing the whole work matters
 *    more here than filling every pixel with sharp image.
 */
interface CardBackdropProps {
  imageUrl: string;
  /** width / height. Unknown (older manifests) falls back to cover. */
  aspect?: number;
}

/** Wider than roughly 9:10 and a full-bleed crop starts eating the subject. */
const LETTERBOX_ABOVE_ASPECT = 0.9;

export const CardBackdrop = memo(function CardBackdrop({ imageUrl, aspect }: CardBackdropProps) {
  const letterbox = aspect !== undefined && aspect > LETTERBOX_ABOVE_ASPECT;

  return (
    <>
      <Image
        source={{ uri: imageUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={220}
        cachePolicy="memory-disk"
        recyclingKey={imageUrl}
        blurRadius={letterbox ? 32 : 0}
      />

      {letterbox ? (
        <>
          {/* Knock the blurred fill back so the sharp artwork reads as the subject. */}
          <View style={styles.blurDim} pointerEvents="none" />
          <View style={styles.letterboxFrame} pointerEvents="none">
            <Image
              source={{ uri: imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              transition={220}
              cachePolicy="memory-disk"
              recyclingKey={`${imageUrl}#sharp`}
            />
          </View>
        </>
      ) : null}

      {/* One scrim over the whole card, not a top and a bottom one.

          The old pair left a gap exactly where the text lives. The bottom
          scrim began at 32% of the card and only reached 0.72 by 63%, while
          the year and the headline sit between 35% and 52% — so they landed in
          the part of the ramp that is still nearly clear. On a dark photograph
          nobody noticed. On the Declaration of Independence, a snowfield or an
          overexposed press photograph, white type sat on white paper.

          Measured rather than guessed: the card was rendered with a forced
          pure-white backdrop and these four stops are the ones that made the
          year and the headline read against it.

          The separate top scrim is gone. FeedTopBar carries its own now, so
          keeping this one as well stacked three layers of darkness over the
          same strip of artwork. */}
      <LinearGradient
        colors={[palette.scrimHint, palette.scrimSoft, palette.scrimText, palette.scrimBottom]}
        locations={[0, 0.28, 0.46, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
    </>
  );
});

const styles = StyleSheet.create({
  blurDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.scrimTop,
  },
  /**
   * Upper slice of the card: the text block owns the lower half, so the sharp
   * artwork sits above it rather than being buried behind the copy.
   */
  letterboxFrame: {
    position: 'absolute',
    top: '6%',
    left: 0,
    right: 0,
    height: '46%',
  },
});
