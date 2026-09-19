import { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  SlideInDown,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { sheetSpring, sheetThresholds } from '@/theme/motion';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * Draggable bottom sheet — the shared physics behind every overlay in the app.
 *
 * Same contract as the feed gesture: the drag lives entirely on the UI thread
 * as one `translateY` shared value, the backdrop derives its opacity from it,
 * and the single JS hop is `scheduleOnRN(onClose)` once the dismiss spring
 * rests. The open animation is declarative (`entering`) rather than an effect,
 * because mutating a shared value that appears in a `useEffect` dependency
 * trips the react-hooks/immutability rule.
 *
 * Only the header area is draggable, so scrollable content inside the sheet
 * keeps its own gestures.
 */
interface BottomSheetProps extends PropsWithChildren {
  onClose: () => void;
  /** Fraction of screen height the sheet occupies. */
  heightRatio?: number;
  /** Rendered inside the drag handle zone. */
  header?: ReactNode;
  accessibilityLabel?: string;
}

export function BottomSheet({
  onClose,
  heightRatio = 0.85,
  header,
  accessibilityLabel = 'Close',
  children,
}: BottomSheetProps) {
  const { height } = useWindowDimensions();
  const sheetHeight = Math.round(height * heightRatio);

  const translateY = useSharedValue(0);
  const dragStart = useSharedValue(0);

  const dismiss = () => {
    translateY.value = withSpring(sheetHeight, sheetSpring, (finished) => {
      if (finished) {
        scheduleOnRN(onClose);
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
          accessibilityLabel={accessibilityLabel}
        />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.springify().damping(32).stiffness(300).mass(0.8)}
        style={[styles.sheet, { height: sheetHeight }, sheetStyle]}
      >
        <GestureDetector gesture={dragGesture}>
          <View style={styles.handleZone}>
            <View style={styles.handle} />
            {header}
          </View>
        </GestureDetector>
        {children}
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
});
