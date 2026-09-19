import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedIntelChip } from '@/components/gamification/FeedIntelChip';
import { spacing } from '@/theme/tokens';

import { FeedDateBar } from './FeedDateBar';

/**
 * The feed's top chrome: streak and rank on the left, date and filter beside
 * them.
 *
 * One row, because two absolutely-positioned siblings overlapped on a real
 * phone. The intel chip was anchored `left: spacing.lg` and grew as wide as
 * the rank name needed; the date bar spanned `left: 0, right: 0` and centred
 * its chips on the FULL screen width. On the wide web preview there was room
 * between them. On a 400dp phone the TODAY chip sat on top of "RECRUIT".
 *
 * Laying them out in a row makes the collision impossible at any width and any
 * rank name, which is worth more than the date chip sitting at the exact
 * centre of the screen — it is now centred in the space the intel chip leaves,
 * a few points to the right, and can never overlap anything.
 */
export const FeedTopBar = memo(function FeedTopBar() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { top: insets.top + spacing.md }]} pointerEvents="box-none">
      <FeedIntelChip />
      <View style={styles.centre} pointerEvents="box-none">
        <FeedDateBar />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  centre: {
    flex: 1,
    alignItems: 'center',
  },
});
