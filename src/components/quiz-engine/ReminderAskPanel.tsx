import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { formatReminderTime, useReminderStore } from '@/stores/useReminderStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * "Tomorrow's lead, at 08:00?" — asked once, at the end of the first daily quiz.
 *
 * OUR question first, the system's second. Android's permission dialog is a
 * one-way door in practice: a reader who taps "Don't allow" on a prompt they
 * did not expect has to find the app in system settings to undo it, and almost
 * nobody does. So the OS is only asked after the reader has said yes here, to a
 * sentence that says exactly what they will get.
 *
 * The answer is recorded whatever it is (`markOffered`), and the panel stays on
 * screen to say what happened rather than vanishing — a reader who tapped
 * "Remind me" and saw nothing change would reasonably tap it again.
 */
type Phase = 'ask' | 'on' | 'refused' | 'gone';

export const ReminderAskPanel = memo(function ReminderAskPanel() {
  const hour = useReminderStore((s) => s.hour);
  const minute = useReminderStore((s) => s.minute);
  const [phase, setPhase] = useState<Phase>('ask');
  const [busy, setBusy] = useState(false);
  const time = formatReminderTime(hour, minute);

  if (phase === 'gone') {
    return null;
  }

  const accept = async () => {
    setBusy(true);
    const store = useReminderStore.getState();
    store.markOffered();
    const granted = await store.setEnabled(true);
    setBusy(false);
    setPhase(granted ? 'on' : 'refused');
  };

  const decline = () => {
    useReminderStore.getState().markOffered();
    setPhase('gone');
  };

  if (phase === 'on') {
    return (
      <View style={styles.panel}>
        <SegmentedText variant="label" style={styles.kicker}>
          Reminder on
        </SegmentedText>
        <Text style={styles.body}>
          {`Tomorrow’s lead arrives at ${time}. Change the time or turn it off in your profile.`}
        </Text>
      </View>
    );
  }

  if (phase === 'refused') {
    return (
      <View style={styles.panel}>
        <SegmentedText variant="label">Notifications are off</SegmentedText>
        <Text style={styles.body}>
          Your phone is blocking notifications for History Unlocked. You can allow them in the
          phone’s settings, and the reminder in your profile will work from then on.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <SegmentedText variant="label" style={styles.kicker}>
        Tomorrow, in history
      </SegmentedText>
      <Text style={styles.lead}>{`Want tomorrow’s lead story at ${time}?`}</Text>
      <Text style={styles.body}>
        One notification a day — the biggest thing that happened on that date. Nothing else.
      </Text>
      <View style={styles.actions}>
        <PressableScale
          onPress={() => {
            void accept();
          }}
          style={styles.yes}
          accessibilityLabel={`Remind me at ${time}`}
        >
          <SegmentedText variant="label" style={styles.yesLabel}>
            {busy ? 'One moment…' : 'Remind me'}
          </SegmentedText>
        </PressableScale>
        <PressableScale onPress={decline} style={styles.no} accessibilityLabel="Not now">
          <SegmentedText variant="label">Not now</SegmentedText>
        </PressableScale>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  kicker: {
    color: palette.accent,
  },
  lead: {
    ...type.fact,
    color: palette.textPrimary,
    fontWeight: '700',
  },
  body: {
    ...type.caption,
    color: palette.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  yes: {
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  yesLabel: {
    color: palette.void,
  },
  no: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
});
