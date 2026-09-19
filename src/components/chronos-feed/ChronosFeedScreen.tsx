import { useCallback, useMemo, useState } from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, View, useWindowDimensions } from 'react-native';

import { EventDetailSheet } from '@/components/event-detail/EventDetailSheet';
import { WelcomeSheet } from '@/components/onboarding/WelcomeSheet';
import { TacticalOverlay } from '@/components/tactical-overlay/TacticalOverlay';
import { useHaptics } from '@/hooks/useHaptics';
import { useFeedStore } from '@/stores/useFeedStore';
import { palette } from '@/theme/tokens';

import { CardProgressRail } from './CardProgressRail';
import { CategoryFilterSheet } from './CategoryFilterSheet';
import { FeedTopBar } from './FeedTopBar';
import { FeedDeck, TerminalKind } from './FeedDeck';
import { FeedEmptyState } from './FeedEmptyState';
import { PersonDetailSheet } from './PersonDetailSheet';
import { SwipeHintPulse } from './SwipeHintPulse';

/**
 * Orchestrator for the Chronos Feed: measures the stage, owns the store
 * subscriptions, and hands a fully-resolved deck to {@link FeedDeck}.
 *
 * The card height is MEASURED rather than read from `useWindowDimensions`.
 * That hook reports 0 in some embedded web contexts, and a zero card height
 * collapses every slot onto the same offset — the reader sees card one while
 * the store believes they are somewhere else entirely. The window height is
 * still used as the first guess so the deck can mount on the very first frame.
 */
export function ChronosFeedScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const [measuredHeight, setMeasuredHeight] = useState(0);
  // Measurement first, window second, screen last. The final fallback exists
  // so a host that reports no window size can never leave the stage blank —
  // the deck mounts at the wrong scale for one frame and the `key` below
  // re-anchors it the moment layout reports the truth.
  const cardHeight = measuredHeight || windowHeight || Dimensions.get('screen').height;

  const deck = useFeedStore((s) => s.deck);
  const dateKey = useFeedStore((s) => s.dateKey);
  // Initialised to the deck plan's start index, so it doubles as the deck's
  // mount anchor: the first unread card on load, wherever the reader is after.
  const activeIndex = useFeedStore((s) => s.activeIndex);
  const hasDepthLock = useFeedStore((s) => s.lockedCount > 0);
  const hasRegister = useFeedStore((s) => s.register !== null);
  // Nothing to choose between on a day that holds one or two events.
  const canVote = useFeedStore((s) => s.dayEvents.length >= 3);
  const settleOnIndex = useFeedStore((s) => s.settleOnIndex);
  const haptics = useHaptics();

  const onSettle = useCallback(
    (index: number) => {
      if (index !== useFeedStore.getState().activeIndex) {
        haptics.cardSettle();
      }
      settleOnIndex(index);
    },
    [haptics, settleOnIndex],
  );

  const onStageLayout = useCallback((event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    setMeasuredHeight((current) => (Math.abs(current - height) > 1 ? height : current));
  }, []);

  // Terminal slots follow the deck, in reading order: the day's register (free
  // for everyone — it is the other half of "on this day", not a Pro perk), then
  // the depth wall if events are still locked, then the quiz gate.
  const terminals = useMemo<TerminalKind[]>(
    () => [
      ...(hasRegister ? (['register'] as const) : []),
      // The ballot comes after the day has been read, never before it: voting
      // on events you have not seen is picking a title, not an event.
      ...(canVote ? (['readers-choice'] as const) : []),
      ...(hasDepthLock ? (['depth-lock'] as const) : []),
      'quiz-gate' as const,
    ],
    [hasRegister, canVote, hasDepthLock],
  );

  // A Time Machine date with no archived events: keep the chrome (date bar,
  // intel chip) so the user can navigate, but show an honest empty state.
  if (deck.length === 0) {
    return (
      <View style={styles.stage} onLayout={onStageLayout}>
        <FeedEmptyState dateKey={dateKey} />
        <CardProgressRail />
        <FeedTopBar />
      </View>
    );
  }

  // The overlays are SIBLINGS of the deck, not children: touches on an open
  // sheet must never feed the deck's pan gesture.
  return (
    <View style={styles.stage} onLayout={onStageLayout}>
      {cardHeight > 0 ? (
        <FeedDeck
          // Re-anchoring the deck means remounting it — see FeedDeck's header.
          // A resize (rotation, split screen) re-anchors on the current card;
          // a new day re-anchors on the reader's first unread event.
          key={cardHeight}
          deck={deck}
          terminals={terminals}
          activeIndex={activeIndex}
          initialIndex={activeIndex}
          cardHeight={cardHeight}
          onSettle={onSettle}
        >
          <CardProgressRail />
          <SwipeHintPulse />
          <FeedTopBar />
        </FeedDeck>
      ) : null}
      <TacticalOverlay />
      <EventDetailSheet />
      <CategoryFilterSheet />
      <PersonDetailSheet />
      <WelcomeSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: palette.void,
    overflow: 'hidden',
  },
});
