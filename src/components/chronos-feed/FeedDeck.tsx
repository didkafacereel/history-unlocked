import { memo, PropsWithChildren, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { QuizGateCard } from '@/components/quiz-engine/QuizGateCard';
import { cardDepth } from '@/theme/motion';
import { HistoricalEvent } from '@/types/manifest';

import { DepthLockCard } from './DepthLockCard';
import { HistoryCardViewer } from './HistoryCardViewer';
import { ReadersChoiceCard } from './ReadersChoiceCard';
import { RegisterCard } from './RegisterCard';
import { useSwipeGesture } from './useSwipeGesture';

/**
 * The swipeable stack itself, separated from the feed's chrome for one
 * structural reason: `scrollY` is a UI-thread shared value that React must not
 * write to, so the ONLY way to re-anchor the deck (a new day, a rotation) is to
 * remount this component. Keeping it small makes that remount cheap and makes
 * the anchoring rule impossible to miss.
 *
 * Rendering model: NOT a list. A 3-card window (previous / active / next) is
 * mounted absolutely; every slot derives its transform from `scrollY` on the UI
 * thread. React re-renders exactly once per settled card change.
 *
 * `cardHeight` is MEASURED by the parent rather than taken from
 * `useWindowDimensions`, which reports 0 in some embedded web contexts — and a
 * zero height silently collapses the whole deck onto a single offset.
 */

/** Non-event cards that live past the end of the deck, in order. */
export type TerminalKind = 'register' | 'readers-choice' | 'depth-lock' | 'quiz-gate';

interface FeedSlot {
  key: string;
  event: HistoricalEvent | null;
  terminal: TerminalKind | null;
  index: number;
}

interface FeedDeckProps extends PropsWithChildren {
  deck: HistoricalEvent[];
  terminals: readonly TerminalKind[];
  activeIndex: number;
  /** Card the deck anchors on at mount — the reader's first unread event. */
  initialIndex: number;
  cardHeight: number;
  onSettle: (index: number) => void;
}

export const FeedDeck = memo(function FeedDeck({
  deck,
  terminals,
  activeIndex,
  initialIndex,
  cardHeight,
  onSettle,
  children,
}: FeedDeckProps) {
  const { gesture, scrollY } = useSwipeGesture({
    deckLength: deck.length + terminals.length,
    cardHeight,
    initialIndex,
    onSettle,
  });

  const window = useMemo(() => {
    const first = Math.max(0, activeIndex - 1);
    const last = Math.min(deck.length + terminals.length - 1, activeIndex + 1);
    const slots: FeedSlot[] = [];
    for (let i = first; i <= last; i++) {
      const event = deck[i];
      if (event) {
        slots.push({ key: event.id, event, terminal: null, index: i });
        continue;
      }
      const terminal = terminals[i - deck.length];
      if (terminal) {
        slots.push({ key: terminal, event: null, terminal, index: i });
      }
    }
    return slots;
  }, [deck, terminals, activeIndex]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.deck}>
        {window.map(({ key, event, terminal, index }) => (
          <CardSlot key={key} index={index} cardHeight={cardHeight} scrollY={scrollY}>
            {event ? (
              <HistoryCardViewer event={event} />
            ) : terminal === 'register' ? (
              <RegisterCard />
            ) : terminal === 'readers-choice' ? (
              <ReadersChoiceCard />
            ) : terminal === 'depth-lock' ? (
              <DepthLockCard />
            ) : (
              <QuizGateCard />
            )}
          </CardSlot>
        ))}
        {children}
      </View>
    </GestureDetector>
  );
});

/**
 * Positions one card off the shared scroll value — the only animated wrapper
 * in the feed. The outgoing card scales and dims slightly for depth.
 */
interface CardSlotProps extends PropsWithChildren {
  index: number;
  cardHeight: number;
  scrollY: SharedValue<number>;
}

const CardSlot = memo(function CardSlot({ index, cardHeight, scrollY, children }: CardSlotProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const offset = index * cardHeight - scrollY.value;
    // 0 → at rest, 1 → fully scrolled past (exiting upward).
    const exitProgress = -offset / cardHeight;

    return {
      transform: [
        { translateY: offset },
        {
          scale: interpolate(exitProgress, [0, 1], [1, cardDepth.minScale], Extrapolation.CLAMP),
        },
      ],
      opacity: interpolate(exitProgress, [0.4, 1], [1, cardDepth.minOpacity], Extrapolation.CLAMP),
    };
  });

  return <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>{children}</Animated.View>;
});

const styles = StyleSheet.create({
  deck: {
    flex: 1,
  },
});
