import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { ResolvedCollection } from '@/data/collections';
import { tierStanding } from '@/data/collectionTiers';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

import { CollectionProgressBar } from './CollectionProgressBar';

/** One set on the Museum board. */
interface CollectionCardProps {
  collection: ResolvedCollection;
  onPress: (id: string) => void;
}

export const CollectionCard = memo(function CollectionCard({
  collection,
  onPress,
}: CollectionCardProps) {
  const { def, read, total } = collection;
  const solemn = def.tone === 'solemn';
  const complete = read >= total && !solemn;
  const standing = tierStanding(read, total);

  return (
    <PressableScale
      onPress={() => onPress(def.id)}
      style={complete ? { ...styles.card, ...styles.cardComplete } : styles.card}
      accessibilityLabel={`${def.title}, ${read} of ${total} ${solemn ? 'read' : 'collected'}`}
    >
      <View style={styles.header}>
        <Text style={styles.glyph}>{def.glyph}</Text>
        <View style={styles.headerText}>
          <SegmentedText variant="fact" style={styles.title}>
            {def.title}
          </SegmentedText>
          <SegmentedText variant="caption">{def.blurb}</SegmentedText>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.countRow}>
          <Text style={complete ? styles.countComplete : styles.count}>
            {complete ? `✓ Complete · ${total}` : `${read} / ${total}`}
          </Text>
          {/* The tier is the reachable target beside the unreachable one. On a
              solemn set it is suppressed along with every other trophy. */}
          {!solemn && standing.reached ? (
            <Text style={styles.tier}>{`${standing.reached.glyph} ${standing.reached.name}`}</Text>
          ) : null}
        </View>
        <CollectionProgressBar read={read} total={total} solemn={solemn} />
        {!solemn && !complete && standing.remaining > 0 ? (
          <SegmentedText variant="caption" style={styles.nextUp}>
            {standing.next
              ? `${standing.remaining} more for ${standing.next.name}`
              : `${standing.remaining} more to finish the set`}
          </SegmentedText>
        ) : null}
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  cardComplete: {
    borderColor: palette.correct,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  glyph: {
    fontSize: 26,
    lineHeight: 32,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: palette.textPrimary,
    fontWeight: '700',
  },
  footer: {
    gap: spacing.sm,
  },
  count: {
    ...type.label,
    color: palette.accent,
  },
  countComplete: {
    ...type.label,
    color: palette.correct,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tier: {
    ...type.label,
    color: palette.textSecondary,
  },
  nextUp: {
    color: palette.textTertiary,
  },
});
