import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * One way into the app, on the launch screen.
 *
 * The picture is commissioned art bundled with the app, not a backdrop from
 * the archive. Every other picture in this app is evidence and carries a
 * credit; this one is a door, and the distinction is worth keeping visible in
 * the types — an archive image reaching a tile would be an image making no
 * claim about the event it came from.
 */
interface LaunchTileProps {
  glyph: string;
  title: string;
  /** One short line. A live count if there is one — never a slogan. */
  subtitle: string;
  /** A bundled `require(...)`, which React Native resolves to a number. */
  image: number;
  /** Draws the tile in the accent colour. For the offer, never for content. */
  highlight?: boolean;
  onPress: () => void;
}

export const LaunchTile = memo(function LaunchTile({
  glyph,
  title,
  subtitle,
  image,
  highlight = false,
  onPress,
}: LaunchTileProps) {
  return (
    <PressableScale
      onPress={onPress}
      style={highlight ? { ...styles.tile, ...styles.tileHighlight } : styles.tile}
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={260} />
      {/* Clear at the head, dark at the foot: the words stay readable without
          hiding the picture underneath them.

          Three stops rather than two, and the top one fully clear. A straight
          0.15→0.92 ramp was built for bright archive photographs; over art
          that is already mostly black with one lit subject it put a second
          veil on the half of the picture worth seeing — the key on the Pro
          tile all but disappeared. The foot stays dark enough for white text
          on the brightest of the four (the lamp on the scenarios tile). */}
      <LinearGradient
        colors={['rgba(6,7,10,0)', 'rgba(6,7,10,0.30)', 'rgba(6,7,10,0.88)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.body}>
        <Text style={styles.glyph}>{glyph}</Text>
        <View style={styles.text}>
          {/* One line each, and the tile is a fixed 116px band: a subtitle
              that wraps pushes its second line past the bottom edge, which is
              how "and every other date" ended up half outside the Pro tile.
              Keep the strings short; this only stops a long one breaking the
              layout. */}
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  tile: {
    height: 116,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    backgroundColor: palette.inkRaised,
    justifyContent: 'flex-end',
  },
  tileHighlight: {
    borderColor: palette.accent,
    borderWidth: 1,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  glyph: {
    fontSize: 26,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...type.headline,
    fontSize: 20,
    lineHeight: 24,
  },
  subtitle: {
    ...type.caption,
  },
});
