import { PropsWithChildren } from 'react';
import { Pressable, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { pressSpring } from '@/theme/motion';
import { hitSlop } from '@/theme/tokens';

/**
 * Standard tactile press: scale to 0.96 on the UI thread. Every tappable
 * element in the app routes through this so presses feel identical.
 */
interface PressableScaleProps extends PropsWithChildren {
  onPress: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function PressableScale({
  onPress,
  style,
  accessibilityLabel,
  children,
}: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value === 1 ? 0.96 : 1, pressSpring) }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
