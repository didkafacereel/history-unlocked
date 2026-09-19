import { memo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/primitives/BottomSheet';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { CollectionEntry, ResolvedCollection } from '@/data/collections';
import { useEventDetailStore } from '@/stores/useEventDetailStore';
import { palette, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

import { CollectionEntryRow } from './CollectionEntryRow';
import { CollectionProgressBar } from './CollectionProgressBar';

/**
 * Everything in one set, oldest first. Read cards open the same reader the
 * feed uses, so a collection is a way INTO the archive rather than a separate
 * copy of it.
 */
interface CollectionSheetProps {
  collection: ResolvedCollection;
  onClose: () => void;
}

export const CollectionSheet = memo(function CollectionSheet({
  collection,
  onClose,
}: CollectionSheetProps) {
  const openDetail = useEventDetailStore((s) => s.open);
  const { def, entries, read, total } = collection;
  const solemn = def.tone === 'solemn';

  const onOpen = (entry: CollectionEntry) => {
    openDetail(entry.event);
  };

  return (
    <BottomSheet
      onClose={onClose}
      accessibilityLabel={`Close ${def.title}`}
      header={
        <View style={styles.header}>
          <View style={styles.headline}>
            <Text style={styles.glyph}>{def.glyph}</Text>
            <Text style={styles.title}>{def.title}</Text>
          </View>
          <SegmentedText variant="caption">{def.blurb}</SegmentedText>
          <View style={styles.progress}>
            <SegmentedText variant="label" style={styles.count}>
              {solemn ? `${read} of ${total} read` : `${read} of ${total} collected`}
            </SegmentedText>
            <CollectionProgressBar read={read} total={total} solemn={solemn} />
          </View>
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        // The sheet's own drag lives on the header, so the list scrolls freely.
      >
        {entries.map((entry) => (
          <CollectionEntryRow
            key={entry.event.id}
            entry={entry}
            solemn={solemn}
            onOpen={onOpen}
          />
        ))}
      </ScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  headline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  glyph: {
    fontSize: 22,
    lineHeight: 26,
  },
  title: {
    ...type.headline,
    fontSize: 20,
    lineHeight: 25,
    flexShrink: 1,
  },
  progress: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  count: {
    color: palette.accent,
  },
  list: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm,
  },
});
