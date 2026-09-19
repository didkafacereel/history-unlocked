import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { CardImageCredit } from '@/components/chronos-feed/CardImageCredit';
import { QuizImage } from '@/stores/useQuizStore';
import { palette, radius } from '@/theme/tokens';

/**
 * The event's archival picture, above the question.
 *
 * A wall of text asking about a place the reader has never pictured is the
 * weakest moment in the app — the feed is built on imagery and the quiz was the
 * one screen that dropped it. This puts the same painting or photograph the
 * card used in front of them while they think.
 *
 * Fixed height, and the artwork is CONTAINED inside it over a blurred copy of
 * itself — the same treatment `CardBackdrop` gives wide art, for the same
 * reason and one more:
 *
 *  - Fixed, because letting each image set its own height would move the choice
 *    buttons on every question and the reader's thumb would land on a different
 *    answer each time.
 *  - Contained rather than cropped, because archival material is not stock
 *    photography. Half of it is objects, coins, portraits and documents shot on
 *    a plain ground, and cropping one of those into a 2.5:1 band leaves an empty
 *    rectangle. Measured, not assumed: the first event tested was a Cnut penny,
 *    and cover-cropping it showed the dark middle strip and nothing else.
 *
 * The credit is not decoration. Every image shipped is public domain or CC, and
 * both require attribution wherever the work appears — including here.
 */
const FRAME_HEIGHT = 176;

export const QuizEventImage = memo(function QuizEventImage({ image }: { image: QuizImage }) {
  return (
    <View>
      <View style={styles.frame}>
        <Image
          source={{ uri: image.url }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          blurRadius={28}
          transition={220}
          accessibilityIgnoresInvertColors
        />
        {/* Knock the blurred fill back so the sharp artwork reads as the subject. */}
        <View style={styles.dim} pointerEvents="none" />
        <Image
          source={{ uri: image.url }}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          transition={220}
          accessibilityIgnoresInvertColors
        />
      </View>
      {image.credit ? <CardImageCredit credit={image.credit} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    height: FRAME_HEIGHT,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  // Written out rather than spread from StyleSheet.absoluteFillObject, which
  // RN 0.85 dropped from the types.
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 8, 14, 0.55)',
  },
});
