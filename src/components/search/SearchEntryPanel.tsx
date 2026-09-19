import { useRouter } from 'expo-router';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { loadArchiveStats } from '@/data/ingestion';
import { useIsPro } from '@/stores/useEntitlementStore';
import { formatCount } from '@/lib/formatCount';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * Profile entry to archive search.
 *
 * States the size of what is being searched, because "Search" alone is a verb
 * with no promise behind it — "search 8,000 events across 366 days" is the
 * reason to tap.
 */
export const SearchEntryPanel = memo(function SearchEntryPanel() {
  const router = useRouter();
  const isPro = useIsPro();
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    void loadArchiveStats().then((s) => {
      if (active) {
        setTotal(s.events);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <PressableScale
      onPress={() => router.push(isPro ? '/search' : '/paywall')}
      style={styles.panel}
      accessibilityLabel={isPro ? 'Search the archive' : 'Unlock archive search with Pro'}
    >
      <Text style={styles.glyph}>🔎</Text>
      <View style={styles.text}>
        <SegmentedText variant="label">Search the archive</SegmentedText>
        <SegmentedText variant="caption">
          {total > 0
            ? `Any person, place or war across ${formatCount(total)} events`
            : 'Any person, place or war, across every date'}
        </SegmentedText>
      </View>
      <Text style={isPro ? styles.chevron : styles.lock}>{isPro ? '›' : '✦'}</Text>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  glyph: {
    fontSize: 20,
    width: 26,
    textAlign: 'center',
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  chevron: {
    color: palette.textTertiary,
    fontSize: 24,
    lineHeight: 26,
  },
  lock: {
    color: palette.accent,
    fontSize: 13,
  },
});
