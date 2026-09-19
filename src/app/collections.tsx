import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CollectionCard } from '@/components/collections/CollectionCard';
import { CollectionSheet } from '@/components/collections/CollectionSheet';
import { EventDetailSheet } from '@/components/event-detail/EventDetailSheet';
import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { loadCollections, ResolvedCollection } from '@/data/collections';
import { goBack } from '@/lib/goBack';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { palette, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * The Museum. Every event read joins the sets it belongs to, and the board
 * shows how far each one has come.
 *
 * Resolved once on mount rather than reactively: the scan touches the whole
 * archive, and a card the reader opens while this screen is on top would
 * otherwise re-sort the board under their finger.
 */
export default function CollectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [collections, setCollections] = useState<ResolvedCollection[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadCollections(useLibraryStore.getState().seen).then((resolved) => {
      if (active) {
        setCollections(resolved);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const open = useMemo(
    () => collections?.find((c) => c.def.id === openId) ?? null,
    [collections, openId],
  );

  const collected = collections?.reduce((sum, c) => sum + c.read, 0) ?? 0;
  const complete = collections?.filter((c) => c.total > 0 && c.read >= c.total).length ?? 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PressableScale
          onPress={() => goBack(router)}
          style={styles.back}
          accessibilityLabel="Back"
        >
          <Text style={styles.backGlyph}>‹</Text>
        </PressableScale>

        <View style={styles.hero}>
          <Text style={styles.title}>The Museum</Text>
          <SegmentedText variant="caption" style={styles.tagline}>
            {collections === null
              ? 'Assembling your collection…'
              : `${collected} cards collected · ${complete} of ${collections.length} sets complete`}
          </SegmentedText>
        </View>

        {collections === null ? (
          <ActivityIndicator color={palette.accent} style={styles.spinner} />
        ) : (
          <View style={styles.board}>
            {collections.map((collection) => (
              <CollectionCard
                key={collection.def.id}
                collection={collection}
                onPress={setOpenId}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {open && <CollectionSheet collection={open} onClose={() => setOpenId(null)} />}
      <EventDetailSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  back: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.inkRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    color: palette.textPrimary,
    fontSize: 24,
    lineHeight: 28,
  },
  hero: {
    gap: spacing.xs,
  },
  title: {
    ...type.headline,
    fontSize: 30,
    lineHeight: 36,
  },
  tagline: {
    color: palette.textSecondary,
  },
  spinner: {
    marginTop: spacing.xxl,
  },
  board: {
    gap: spacing.md,
  },
});
