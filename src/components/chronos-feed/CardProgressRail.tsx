import { useRouter } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/primitives/PressableScale';
import { useFeedStore } from '@/stores/useFeedStore';
import { swipeSpring } from '@/theme/motion';
import { palette, radius, spacing } from '@/theme/tokens';

import { TerminalKind } from './FeedDeck';

/**
 * Vertical position dots on the right edge — the shape of the day, not just
 * where you are in it.
 *
 * It used to count `deck.length` only, so a reader reached "three of three"
 * with no sign that anything followed. What follows is the register, sometimes
 * a ballot, and always the day's scenario — the retention mechanic, sitting
 * behind every event on the day. For a Pro reader that is twenty-five swipes
 * away and invisible until you arrive.
 *
 * So the terminals get their own marks, and the quiz's is a butterfly in the
 * accent colour that can be tapped from the first card. The reading order is
 * untouched: scenarios still come after the day, for anyone who swipes there.
 * This only stops the feature being a secret.
 *
 * Subscribes to activeIndex and deck length alone, so a card settle re-renders
 * this rail and nothing else.
 */
interface CardProgressRailProps {
  /** The cards that follow the deck, in order. Drawn after the dots. */
  terminals: readonly TerminalKind[];
}

export const CardProgressRail = memo(function CardProgressRail({
  terminals,
}: CardProgressRailProps) {
  const total = useFeedStore((s) => s.deck.length);
  const activeIndex = useFeedStore((s) => s.activeIndex);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (total < 2) {
    return null;
  }

  return (
    // box-none, not none: the rail itself must stay transparent to the deck's
    // pan gesture, while the one marker inside it still takes a tap. The same
    // arrangement the top bar's chips use.
    <View style={[styles.rail, { top: insets.top + spacing.xl }]} pointerEvents="box-none">
      {Array.from({ length: total }, (_, i) => (
        <RailDot key={i} isActive={i === activeIndex} />
      ))}

      {terminals.map((terminal, i) => {
        const isActive = total + i === activeIndex;
        if (terminal !== 'quiz-gate') {
          return <RailDot key={terminal} isActive={isActive} muted />;
        }
        return (
          <PressableScale
            key={terminal}
            onPress={() => router.push('/quiz')}
            accessibilityLabel="Go to today’s scenario"
            style={styles.quiz}
          >
            <Text style={[styles.quizGlyph, isActive && styles.quizGlyphActive]}>🦋</Text>
          </PressableScale>
        );
      })}
    </View>
  );
});

const RailDot = memo(function RailDot({
  isActive,
  muted = false,
}: {
  isActive: boolean;
  muted?: boolean;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    height: withSpring(isActive ? 22 : 6, swipeSpring),
    opacity: withSpring(isActive ? 1 : muted ? 0.28 : 0.45, swipeSpring),
  }));

  return <Animated.View style={[styles.dot, isActive && styles.dotActive, animatedStyle]} />;
});

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    right: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 4,
    borderRadius: radius.pill,
    backgroundColor: palette.textTertiary,
  },
  dotActive: {
    backgroundColor: palette.accent,
  },
  quiz: {
    // Padding rather than hitSlop, because PressableScale does not take one
    // and widening a shared primitive for a single caller is the wrong trade.
    // 15px of glyph plus 12 either side is a ~39px target; the negative margin
    // keeps it from pushing the dots above it out of rhythm.
    padding: spacing.md,
    marginVertical: -spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quizGlyph: {
    fontSize: 15,
    opacity: 0.55,
  },
  quizGlyphActive: {
    opacity: 1,
  },
});
