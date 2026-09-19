import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import {
  feedbackConfigured,
  suggestionText,
  suggestionUrl,
} from '@/config/feedback';
import { shortDateKeyLabel } from '@/lib/dateKey';
import { useIsPro } from '@/stores/useEntitlementStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * "Missing something from this day?" — a Pro reader's line to the editor.
 *
 * Placed at the close of the day's register rather than in a settings screen,
 * because that is the moment the thought occurs: you have just read everything
 * the date holds and something you expected is not there. The message carries
 * the date and a digest of what IS there, so a report can be judged without a
 * lookup.
 *
 * Pro only, by design: a free reader has seen three of twenty-two events and
 * would mostly report things that are already in the archive further down.
 */
export const SuggestEventButton = memo(function SuggestEventButton() {
  const router = useRouter();
  const isPro = useIsPro();
  const dateKey = useFeedStore((s) => s.dateKey);
  const dayEvents = useFeedStore((s) => s.dayEvents);
  const [copied, setCopied] = useState(false);

  // No destination configured means no button, rather than one that opens a
  // composer addressed to nobody.
  if (!feedbackConfigured || !dateKey) {
    return null;
  }

  const context = {
    dateKey,
    dateLabel: shortDateKeyLabel(dateKey),
    events: dayEvents,
  };

  const onPress = async () => {
    if (!isPro) {
      router.push('/paywall');
      return;
    }

    const url = suggestionUrl(context);
    if (url) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // No mail client, or the URL was refused — fall through to the copy.
      }
    }

    // Losing what the reader was about to write is the one unacceptable
    // outcome, so the text goes to the clipboard and the label says so.
    try {
      await Clipboard.setStringAsync(suggestionText(context));
      setCopied(true);
    } catch {
      // Nothing left to try; the button simply does not confirm.
    }
  };

  return (
    <View style={styles.wrap}>
      <PressableScale
        onPress={() => {
          void onPress();
        }}
        style={styles.button}
        accessibilityLabel={
          isPro
            ? `Suggest an event we missed on ${context.dateLabel}`
            : 'Suggesting events is a Pro feature'
        }
      >
        <Text style={styles.glyph}>{copied ? '✓' : '✎'}</Text>
        <SegmentedText variant="label" style={styles.label}>
          {copied ? 'Copied — paste it to us' : 'Missing something from this day?'}
        </SegmentedText>
        {isPro ? null : <Text style={styles.lock}>✦</Text>}
      </PressableScale>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  glyph: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 16,
  },
  label: {
    color: palette.textSecondary,
  },
  lock: {
    color: palette.accent,
    fontSize: 11,
  },
});
