import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useHaptics } from '@/hooks/useHaptics';
import { useIsPro } from '@/stores/useEntitlementStore';
import { TacticalPayload, useOverlayStore } from '@/stores/useOverlayStore';
import { sheetSpring, sheetThresholds } from '@/theme/motion';
import { palette, radius, spacing } from '@/theme/tokens';

import { AssetManifestList } from './AssetManifestList';
import { CommanderRoster } from './CommanderRoster';
import { StrategicImpactTimeline } from './StrategicImpactTimeline';
import { TacticalLockPanel } from './TacticalLockPanel';

/**
 * Host for the Tactical Deep Dive sheet. Mounts only while a payload is set,
 * so the closed state costs the feed exactly zero nodes.
 *
 * Sheet physics live on the UI thread (same contract as the feed gesture):
 * the drag handle's pan writes a single `translateY` shared value, the
 * backdrop derives its opacity from it, and the only JS hop is
 * `scheduleOnRN(close)` after the dismiss spring rests.
 */
export function TacticalOverlay() {
  const payload = useOverlayStore((s) => s.payload);

  if (!payload) {
    return null;
  }
  return <TacticalSheet payload={payload} />;
}

function TacticalSheet({ payload }: { payload: TacticalPayload }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const close = useOverlayStore((s) => s.close);
  const isPro = useIsPro();
  const haptics = useHaptics();

  const sheetHeight = Math.round(height * 0.82);
  // Starts at 0 (open): the slide-in is declarative (`entering` below), so no
  // effect ever touches this value — drag and dismiss are its only writers.
  const translateY = useSharedValue(0);
  /** Sheet offset when the current drag began (mid-spring grabs included). */
  const dragStart = useSharedValue(0);

  useEffect(() => {
    haptics.sheetSnap();
  }, [haptics]);

  const dismiss = () => {
    haptics.sheetSnap();
    translateY.value = withSpring(sheetHeight, sheetSpring, (finished) => {
      if (finished) {
        scheduleOnRN(close);
      }
    });
  };

  const dragGesture = Gesture.Pan()
    .onStart(() => {
      cancelAnimation(translateY);
      dragStart.value = translateY.value;
    })
    .onUpdate((event) => {
      const raw = dragStart.value + event.translationY;
      // Downward follows the finger; upward past open is heavily resisted.
      translateY.value = raw >= 0 ? raw : raw / sheetThresholds.upwardResistance;
    })
    .onEnd((event) => {
      const shouldDismiss =
        translateY.value > sheetThresholds.dismissDistance ||
        event.velocityY > sheetThresholds.dismissVelocity;

      if (shouldDismiss) {
        scheduleOnRN(dismiss);
      } else {
        translateY.value = withSpring(0, sheetSpring);
      }
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, sheetHeight], [1, 0]),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View entering={FadeIn.duration(220)} style={[styles.backdrop, backdropStyle]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Close tactical view"
        />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.springify().damping(32).stiffness(300).mass(0.8)}
        style={[styles.sheet, { height: sheetHeight }, sheetStyle]}
      >
        <GestureDetector gesture={dragGesture}>
          <View style={styles.handleZone}>
            <View style={styles.handle} />
            <SegmentedText variant="label" style={styles.kicker}>
              ⌖ Tactical View
            </SegmentedText>
            <SegmentedText variant="headline">{payload.eventTitle}</SegmentedText>
          </View>
        </GestureDetector>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Assets are the free teaser; commanders + strategic impact are Pro. */}
          <Animated.View entering={FadeInDown.duration(320).delay(60)}>
            <AssetManifestList assets={payload.tactical.assets} />
          </Animated.View>
          {isPro ? (
            <>
              <Animated.View entering={FadeInDown.duration(320).delay(140)}>
                <CommanderRoster commanders={payload.tactical.commanders} />
              </Animated.View>
              <Animated.View entering={FadeInDown.duration(320).delay(220)}>
                <StrategicImpactTimeline impacts={payload.tactical.impacts} />
              </Animated.View>
            </>
          ) : (
            <Animated.View entering={FadeInDown.duration(320).delay(140)}>
              <TacticalLockPanel />
            </Animated.View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 7, 10, 0.66)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.ink,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  handleZone: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: palette.textTertiary,
    marginBottom: spacing.sm,
  },
  kicker: {
    color: palette.accent,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
});
