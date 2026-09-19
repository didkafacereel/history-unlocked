import { Gesture, PanGesture } from 'react-native-gesture-handler';
import {
  SharedValue,
  cancelAnimation,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { swipeSpring, swipeThresholds } from '@/theme/motion';

/**
 * The kinetic core of the Chronos Feed.
 *
 * PERFORMANCE CONTRACT: every callback below is a worklet running on the UI
 * thread. No React state is read or written between finger-down and card
 * settle — the single JS-thread hop is `scheduleOnRN(onSettle)` AFTER the
 * spring completes. This is what guarantees gesture-time 60fps.
 *
 * `scrollY` is the one source of truth for deck position: card `i` rests at
 * `i * cardHeight` and every card slot derives its transform from this value.
 */

interface SwipeGestureConfig {
  deckLength: number;
  cardHeight: number;
  /**
   * Card the deck opens on — the reader's first unread event. Read once, at
   * mount: `scrollY` is a UI-thread value and must not be written from React.
   * The feed remounts on `deckToken` when the day changes, which is what makes
   * a later change to this prop take effect.
   */
  initialIndex?: number;
  /** JS-thread callback fired once per completed card transition. */
  onSettle: (index: number) => void;
}

export interface SwipeGestureHandle {
  gesture: PanGesture;
  scrollY: SharedValue<number>;
}

export function useSwipeGesture({
  deckLength,
  cardHeight,
  initialIndex = 0,
  onSettle,
}: SwipeGestureConfig): SwipeGestureHandle {
  const scrollY = useSharedValue(initialIndex * cardHeight);
  /** Index the deck was resting on when the current gesture began. */
  const restIndex = useSharedValue(initialIndex);

  const gesture = Gesture.Pan()
    // Vertical intent only; leaves horizontal room for future in-card gestures.
    .activeOffsetY([-12, 12])
    .failOffsetX([-24, 24])
    .onStart(() => {
      // Catch mid-spring grabs: the deck re-anchors wherever the finger lands.
      cancelAnimation(scrollY);
      restIndex.value = Math.round(scrollY.value / cardHeight);
    })
    .onUpdate((event) => {
      const anchor = restIndex.value * cardHeight;
      const raw = anchor - event.translationY;
      const max = (deckLength - 1) * cardHeight;

      // Rubber-band past either end of the deck.
      if (raw < 0) {
        scrollY.value = raw / swipeThresholds.edgeResistance;
      } else if (raw > max) {
        scrollY.value = max + (raw - max) / swipeThresholds.edgeResistance;
      } else {
        scrollY.value = raw;
      }
    })
    .onEnd((event) => {
      const dragged = -event.translationY; // positive = toward next card
      const flung = Math.abs(event.velocityY) >= swipeThresholds.velocity;
      const travelled = Math.abs(dragged) >= cardHeight * swipeThresholds.distanceRatio;

      let target = restIndex.value;
      if (flung) {
        target += event.velocityY < 0 ? 1 : -1;
      } else if (travelled) {
        target += dragged > 0 ? 1 : -1;
      }
      target = Math.min(Math.max(target, 0), deckLength - 1);

      scrollY.value = withSpring(target * cardHeight, swipeSpring, (finished) => {
        if (finished) {
          scheduleOnRN(onSettle, target);
        }
      });
    });

  return { gesture, scrollY };
}
