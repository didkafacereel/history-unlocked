import { Image } from 'expo-image';
import { memo } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/primitives/BottomSheet';
import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { ShareEventButton } from '@/components/share/ShareEventButton';
import { useEventDetailStore } from '@/stores/useEventDetailStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { HistoricalEvent } from '@/types/manifest';

import { DetailFactRow } from './DetailFactRow';

/**
 * The read-more view. The feed card is deliberately dense — two lines per fact,
 * one glance — which means anything longer has to live somewhere. This is that
 * somewhere: full facts, the longer narrative, where it happened, and a link out
 * to the source for anyone who wants the whole article.
 *
 * Mounts only while an event is selected, so a closed reader costs the feed
 * nothing.
 */
export const EventDetailSheet = memo(function EventDetailSheet() {
  const event = useEventDetailStore((s) => s.event);
  if (!event) {
    return null;
  }
  return <DetailContent event={event} />;
});

function DetailContent({ event }: { event: HistoricalEvent }) {
  const close = useEventDetailStore((s) => s.close);
  const insets = useSafeAreaInsets();

  const yearLabel = event.year < 0 ? `${Math.abs(event.year)} BCE` : `${event.year} AD`;
  const wikiUrl = event.wikiTitle
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(event.wikiTitle.replace(/ /g, '_'))}`
    : null;

  return (
    <BottomSheet
      onClose={close}
      heightRatio={0.9}
      accessibilityLabel="Close the reader"
      header={
        <>
          <View style={styles.metaRow}>
            <SegmentedText variant="label" style={styles.year}>
              {yearLabel}
            </SegmentedText>
            {event.category ? (
              <View style={styles.categoryChip}>
                <SegmentedText variant="label" style={styles.categoryText}>
                  {event.category}
                </SegmentedText>
              </View>
            ) : null}
          </View>
          <Text style={styles.title}>{event.title}</Text>
        </>
      }
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* `contain`, not `cover`: archival art ranges from tall portraits to
            wide panoramas, and a fixed-height crop would slice the subject out. */}
        <Image
          source={{ uri: event.imageUrl }}
          style={styles.hero}
          contentFit="contain"
          transition={200}
          cachePolicy="memory-disk"
        />

        <View style={styles.section}>
          <SegmentedText variant="label">Key facts</SegmentedText>
          <View style={styles.facts}>
            {event.facts.map((fact) => (
              <DetailFactRow key={fact.id} icon={fact.icon} text={fact.text} />
            ))}
          </View>
        </View>

        {event.summary ? (
          <View style={styles.section}>
            <SegmentedText variant="label">The story</SegmentedText>
            <Text style={styles.body}>{event.summary}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <SegmentedText variant="label">Where</SegmentedText>
          <Text style={styles.where}>{event.region}</Text>
          {event.coordinates ? (
            <SegmentedText variant="caption">
              {`${event.coordinates.lat.toFixed(4)}°, ${event.coordinates.lon.toFixed(4)}°`}
            </SegmentedText>
          ) : null}
        </View>

        <View style={styles.actions}>
          <ShareEventButton event={event} />
          {wikiUrl ? (
            <PressableScale
              onPress={() => {
                void Linking.openURL(wikiUrl);
              }}
              style={styles.sourceButton}
              accessibilityLabel="Read the full article on Wikipedia"
            >
              <SegmentedText variant="label" style={styles.sourceLabel}>
                Full article ↗
              </SegmentedText>
            </PressableScale>
          ) : null}
        </View>

        {event.imageCredit || event.textCredit ? (
          <Text style={styles.credit}>
            {[event.imageCredit, event.textCredit].filter(Boolean).join('\n')}
          </Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  year: {
    color: palette.accent,
  },
  categoryChip: {
    backgroundColor: palette.inkRaised,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
  },
  categoryText: {
    color: palette.textSecondary,
    fontSize: 10,
  },
  title: {
    ...type.headline,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  hero: {
    width: '100%',
    height: 240,
    borderRadius: radius.lg,
    backgroundColor: palette.inkRaised,
  },
  section: {
    gap: spacing.md,
  },
  facts: {
    gap: spacing.md,
  },
  body: {
    ...type.fact,
    lineHeight: 26,
    color: palette.textSecondary,
  },
  where: {
    ...type.fact,
    color: palette.textPrimary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sourceButton: {
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  sourceLabel: {
    color: palette.textSecondary,
  },
  credit: {
    ...type.caption,
    fontSize: 11,
    color: palette.textTertiary,
  },
});
