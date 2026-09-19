import { memo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { dailyReminders } from '@/services/notifications';
import { formatReminderTime, useReminderStore } from '@/stores/useReminderStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * The daily reminder control.
 *
 * Times are a short list of chips rather than a picker: a wheel for a value the
 * reader sets once, and where any minute is as good as its neighbour, is
 * ceremony. Six sensible hours cover every routine anyone actually has.
 *
 * Free for everyone. Gating the one thing that brings a reader back would be
 * charging for the habit and then wondering where the habit went.
 */
const TIMES: [number, number][] = [
  [7, 0],
  [8, 0],
  [9, 0],
  [12, 30],
  [18, 0],
  [21, 0],
];

export const DailyReminderPanel = memo(function DailyReminderPanel() {
  const enabled = useReminderStore((s) => s.enabled);
  const hour = useReminderStore((s) => s.hour);
  const minute = useReminderStore((s) => s.minute);
  const setEnabled = useReminderStore((s) => s.setEnabled);
  const setTime = useReminderStore((s) => s.setTime);
  const [denied, setDenied] = useState(false);

  if (!dailyReminders.supported) {
    return (
      <View style={styles.panel}>
        <SegmentedText variant="label">Daily reminder</SegmentedText>
        <SegmentedText variant="caption">
          Available in the phone app — the browser cannot schedule notifications.
        </SegmentedText>
      </View>
    );
  }

  const onToggle = (next: boolean) => {
    void setEnabled(next).then((granted) => setDenied(next && !granted));
  };

  return (
    <View style={styles.panel}>
      <View style={styles.headRow}>
        <View style={styles.headText}>
          <SegmentedText variant="label">Daily reminder</SegmentedText>
          <SegmentedText variant="caption">
            {enabled
              ? `One notification at ${formatReminderTime(hour, minute)}, with the day’s lead`
              : 'One notification a day, naming what happened'}
          </SegmentedText>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: palette.glass, true: palette.accentDim }}
          thumbColor={enabled ? palette.accent : palette.textTertiary}
          accessibilityLabel="Daily reminder"
        />
      </View>

      {denied ? (
        <SegmentedText variant="caption" style={styles.denied}>
          Notifications are blocked for this app in your system settings.
        </SegmentedText>
      ) : null}

      {enabled ? (
        <View style={styles.times}>
          {TIMES.map(([h, m]) => {
            const active = h === hour && m === minute;
            return (
              <PressableScale
                key={`${h}-${m}`}
                onPress={() => {
                  void setTime(h, m);
                }}
                style={active ? { ...styles.chip, ...styles.chipActive } : styles.chip}
                accessibilityLabel={`Remind me at ${formatReminderTime(h, m)}`}
              >
                <Text style={active ? styles.chipLabelActive : styles.chipLabel}>
                  {formatReminderTime(h, m)}
                </Text>
              </PressableScale>
            );
          })}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headText: {
    flex: 1,
    gap: spacing.xs,
  },
  denied: {
    color: palette.incorrect,
  },
  times: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    borderColor: palette.accent,
    backgroundColor: palette.accentDim,
  },
  chipLabel: {
    ...type.label,
    color: palette.textSecondary,
  },
  chipLabelActive: {
    ...type.label,
    color: palette.accent,
  },
});
