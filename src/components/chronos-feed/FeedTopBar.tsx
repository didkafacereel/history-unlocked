import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedIntelChip } from '@/components/gamification/FeedIntelChip';
import { PressableScale } from '@/components/primitives/PressableScale';
import { useHubStore } from '@/stores/useHubStore';
import { palette, radius, spacing } from '@/theme/tokens';

import { FeedDateBar } from './FeedDateBar';

/**
 * The feed's top chrome: a way out on the left, progression beside it, and the
 * day's controls on the right.
 *
 * It is a BAR now, with its own ground, and that is the fix rather than a
 * tidy-up. The chips used to float directly on the card. A card is
 * bottom-anchored and grows upward, and `paddingTop` on its content reserves
 * the band but cannot clamp it — a long card overruns the reservation, and the
 * reader sees an era badge or a headline sliding under the TODAY chip and
 * reads it as a rendering fault. On a photographic backdrop it looks worse
 * still, because there is no edge to say where the app stops and the picture
 * starts. A scrim behind the row draws that edge, so anything arriving
 * underneath passes behind chrome instead of colliding with it.
 *
 * Widths are the other half. An earlier version put both groups in one row and
 * let them size to content; at 375dp that came to about a pixel under the
 * screen, and a 360dp phone overflowed. So the left group is fixed and small,
 * the right group shrinks, and its labels are single-line: when there is not
 * enough room the words shorten, which is legible, rather than the chips
 * overlapping, which is not.
 */
export const FeedTopBar = memo(function FeedTopBar() {
  const insets = useSafeAreaInsets();
  const leave = useHubStore((s) => s.leave);

  return (
    // box-none, not none: the bar is transparent to the deck's pan gesture
    // everywhere except on the controls themselves.
    <View style={styles.bar} pointerEvents="box-none">
      <LinearGradient
        colors={[palette.scrimBottom, palette.scrimMid, 'transparent']}
        locations={[0, 0.55, 1]}
        style={[styles.scrim, { height: insets.top + TOP_BAR_BAND }]}
        pointerEvents="none"
      />

      <View style={[styles.row, { paddingTop: insets.top + spacing.md }]} pointerEvents="box-none">
        <View style={styles.left} pointerEvents="box-none">
          <PressableScale
            onPress={leave}
            style={styles.back}
            accessibilityLabel="Back to the menu"
          >
            <Text style={styles.backGlyph}>‹</Text>
          </PressableScale>
          <FeedIntelChip />
        </View>

        <View style={styles.right} pointerEvents="box-none">
          <FeedDateBar />
        </View>
      </View>
    </View>
  );
});

/**
 * How far the bar reaches below the safe-area inset: the row's own offset, a
 * chip, and room for the scrim to fade out in.
 *
 * Exported because HistoryCardViewer reserves exactly this much at the top of
 * every card. The two used to be separate constants — 82 here, 62 there — and
 * the 20pt of daylight between them was the fade tail lying across the card's
 * first line: "TODAY'S LEAD" rendered at half brightness and looked like a
 * loading state. One number, imported, so they cannot drift apart again.
 */
export const TOP_BAR_BAND = spacing.md + 38 + spacing.xxl;

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    // md, not lg: the eight points saved here are the difference between the
    // row fitting and not fitting on a 360dp phone.
    paddingHorizontal: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  right: {
    // `flex: 1`, not `flexShrink: 1`. Shrink alone left the group at its
    // content width and overflowing LEFTWARDS into the intel chip — measured
    // at 360dp: intel ended at x=139, the date chip began at x=117. A flex
    // basis of zero means the group is sized by the space that is left rather
    // than by what it wants, so the overlap is not a matter of tuning.
    // `minWidth: 0` for the same reason one level down.
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  back: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  backGlyph: {
    color: palette.textPrimary,
    fontSize: 22,
    // Nudged up: the glyph sits low in its line box and looks off-centre in a
    // circle otherwise.
    lineHeight: 24,
  },
});
