import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { palette, radius } from '@/theme/tokens';

/**
 * A face, or a monogram when there is no free-licensed one.
 *
 * About one person in sixteen has no usable portrait, and a ragged list where
 * some rows have images and others have a hole reads as broken rather than as
 * incomplete. The monogram keeps the column straight and is honest — it claims
 * nothing about what they looked like.
 */
interface PersonPortraitProps {
  name: string;
  imageUrl?: string;
  size?: number;
}

export const PersonPortrait = memo(function PersonPortrait({
  name,
  imageUrl,
  size = 44,
}: PersonPortraitProps) {
  const frame = { width: size, height: size, borderRadius: size / 2 };

  if (!imageUrl) {
    return (
      <View style={[styles.monogram, frame]}>
        <Text style={[styles.initial, { fontSize: size * 0.4 }]}>
          {name.trim().charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: imageUrl }}
      style={[styles.photo, frame]}
      // Portraits are cropped to a circle, so the subject's face has to survive
      // the crop — `cover` centres it; `contain` would letterbox inside a circle.
      contentFit="cover"
      transition={180}
      cachePolicy="memory-disk"
      recyclingKey={imageUrl}
      accessibilityLabel={`Portrait of ${name}`}
    />
  );
});

const styles = StyleSheet.create({
  photo: {
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  monogram: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    borderRadius: radius.pill,
  },
  initial: {
    color: palette.textTertiary,
    fontWeight: '700',
  },
});
