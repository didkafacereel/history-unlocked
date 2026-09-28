import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ReminderAskPanel } from '@/components/quiz-engine/ReminderAskPanel';
import { shouldAskInFeed } from '@/lib/reminderOffer';
import { dailyReminders } from '@/services/notifications';
import { useEventsReadCount } from '@/stores/useLibraryStore';
import { useShouldWelcome } from '@/stores/useOnboardingStore';
import { useReminderStore } from '@/stores/useReminderStore';
import { palette, spacing } from '@/theme/tokens';

/**
 * The daily reminder, asked in the feed once the reader is three cards in.
 *
 * Until 28 September the only ask sat at the end of the first daily quiz, and
 * nobody reached it — not even the app's owner, whose phone never received a
 * single reminder. The reminder is the habit engine; an ask that nobody sees is
 * the same as no reminder at all.
 *
 * A SIBLING of the deck, like every other sheet (the overlay rule), and opened
 * through a latch in the store rather than a condition: answering "Remind me"
 * flips the very flags the condition reads, and the sheet must stay long enough
 * to say what happened.
 */
const SETTLE_MS = 700;

export const ReminderAskSheet = memo(function ReminderAskSheet() {
  const open = useReminderStore((s) => s.feedAskOpen);
  const readCount = useEventsReadCount();
  const welcoming = useShouldWelcome();
  const hydrated = useReminderStore((s) => s.hydrated);
  const enabled = useReminderStore((s) => s.enabled);
  const offered = useReminderStore((s) => s.offered);
  const askedInFeed = useReminderStore((s) => s.askedInFeed);
  const close = useReminderStore((s) => s.closeFeedAsk);

  const ask =
    hydrated &&
    !welcoming &&
    !open &&
    shouldAskInFeed({
      supported: dailyReminders.supported,
      enabled,
      offered,
      askedInFeed,
      readCount,
    });

  useEffect(() => {
    if (!ask) {
      return;
    }
    // Let the card that just landed finish settling before anything rises over it.
    const timer = setTimeout(() => useReminderStore.getState().openFeedAsk(), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [ask]);

  if (!open) {
    return null;
  }

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.scrim}>
      <Animated.View entering={FadeInDown.duration(320)} style={styles.holder}>
        <ReminderAskPanel source="feed" onDone={close} />
      </Animated.View>
      <View style={styles.spacer} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: palette.scrimText,
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  holder: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  spacer: {
    height: spacing.xl,
  },
});
