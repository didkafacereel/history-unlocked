import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { eventUrlLabel } from '@/lib/eventLink';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { HistoricalEvent } from '@/types/manifest';

/**
 * The 9:16 image people post to a story. It is NOT the feed card: a screenshot
 * of the app would carry our chrome (streak chip, progress rail, swipe hint)
 * and none of the context a stranger needs. This is a purpose-built poster —
 * one image, one year, one headline, one fact, and a wordmark so the person who
 * sees it knows where it came from.
 *
 * Rendered off-screen at a fixed 1080x1920 and captured with react-native-view-shot,
 * so the export is identical on every device regardless of screen size.
 */

export const SHARE_WIDTH = 1080;
export const SHARE_HEIGHT = 1920;
/** Rendered at a fraction of export size, then captured at full resolution. */
export const SHARE_PREVIEW_SCALE = 0.25;

interface ShareCardProps {
  event: HistoricalEvent;
}

export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard({ event }, ref) {
  const headlineFact = event.facts[0]?.text;
  const yearLabel = event.year < 0 ? `${Math.abs(event.year)} BCE` : String(event.year);
  const wide = event.imageAspect !== undefined && event.imageAspect > 0.9;
  // Only printed once the archive is actually hosted — see `eventUrlLabel`.
  // A `historyunlocked://` scheme on a poster is noise to everyone who sees it.
  const link = eventUrlLabel(event.id);

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      <Image
        source={{ uri: event.imageUrl }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        blurRadius={wide ? 48 : 0}
        cachePolicy="memory-disk"
      />
      {wide ? (
        <View style={styles.artFrame}>
          <Image
            source={{ uri: event.imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        </View>
      ) : null}

      <LinearGradient
        colors={['rgba(6,7,10,0.75)', 'transparent']}
        style={styles.topScrim}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(6,7,10,0.80)', 'rgba(6,7,10,0.97)']}
        locations={[0, 0.45, 1]}
        style={styles.bottomScrim}
        pointerEvents="none"
      />

      <View style={styles.header}>
        <Text style={styles.kicker}>ON THIS DAY</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.yearChip}>
          <Text style={styles.yearChipText}>{yearLabel}</Text>
        </View>
        <Text style={styles.title} numberOfLines={4}>
          {event.title}
        </Text>
        {headlineFact ? (
          <Text style={styles.fact} numberOfLines={4}>
            {headlineFact}
          </Text>
        ) : null}

        <View style={styles.rule} />
        <View style={styles.footer}>
          <View style={styles.brand}>
            <Text style={styles.wordmark}>HISTORY UNLOCKED</Text>
            {link ? (
              <Text style={styles.link} numberOfLines={1}>
                {link}
              </Text>
            ) : null}
          </View>
          {event.imageCredit ? (
            <Text style={styles.credit} numberOfLines={1}>
              {event.imageCredit}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
});

const PAD = 72;

const styles = StyleSheet.create({
  card: {
    width: SHARE_WIDTH,
    height: SHARE_HEIGHT,
    backgroundColor: palette.void,
    overflow: 'hidden',
  },
  artFrame: {
    position: 'absolute',
    top: '8%',
    left: 0,
    right: 0,
    height: '44%',
  },
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '18%',
  },
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '62%',
  },
  header: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    right: PAD,
  },
  kicker: {
    ...type.label,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: 6,
    color: palette.accent,
  },
  body: {
    position: 'absolute',
    left: PAD,
    right: PAD,
    bottom: PAD,
  },
  yearChip: {
    alignSelf: 'flex-start',
    borderWidth: 3,
    borderColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xl,
  },
  yearChipText: {
    fontSize: 44,
    lineHeight: 54,
    fontWeight: '800',
    letterSpacing: 2,
    color: palette.accent,
  },
  title: {
    fontSize: 92,
    lineHeight: 100,
    fontWeight: '800',
    letterSpacing: -1.5,
    color: palette.textPrimary,
  },
  fact: {
    fontSize: 40,
    lineHeight: 54,
    fontWeight: '500',
    color: palette.textSecondary,
    marginTop: spacing.xl,
  },
  rule: {
    height: 3,
    backgroundColor: palette.accent,
    width: 140,
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  brand: {
    gap: spacing.xs,
    flexShrink: 0,
  },
  wordmark: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 5,
    color: palette.textPrimary,
  },
  link: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: palette.accent,
  },
  credit: {
    flexShrink: 1,
    fontSize: 22,
    color: palette.textTertiary,
    textAlign: 'right',
  },
});
