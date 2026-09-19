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

      <LinearGradient
        colors={[palette.scrimTop, 'transparent']}
        style={styles.topScrim}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', palette.scrimMid, palette.scrimBottom]}
        locations={[0, 0.45, 1]}
        style={styles.bottomScrim}
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
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '22%',
  },
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '68%',
  },
});
