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
 * The picture is a real backdrop from today's archive rather than stock art:
 * it is already downloaded, already credited, already free-licensed, and it
 * changes every day on its own. A fixed illustration would be one more thing
 * to keep true.
 *
 * `image` is optional so a tile still works before the archive arrives, and so
 * a hand-made picture can be dropped in later without touching anything else.
 */
interface LaunchTileProps {
  glyph: string;
  title: string;
  /** One short line. A live count if there is one — never a slogan. */
  subtitle: string;
  /**
   * A remote URI from the archive, or a bundled `require(...)`, which React
   * Native resolves to a number. expo-image takes either as-is.
   */
  image?: string | number;
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
      {image ? (
        <Image source={image} style={StyleSheet.absoluteFill} contentFit="cover" transition={260} />
      ) : null}
      {/* Dark at the foot, clear at the head: the words stay readable over any
          photograph without hiding the one underneath them. */}
      <LinearGradient
        colors={['rgba(6,7,10,0.15)', 'rgba(6,7,10,0.92)']}
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
