import { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFoundersStore } from '@/stores/useFoundersStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * Deleting the account — quiet until asked for, then completely explicit.
 *
 * Google Play requires this of any app that lets people create an account, and
 * requires that it not be buried behind a support address. What it does not
 * require is that it be easy to hit by accident, which is why the destructive
 * button does not exist until the reader has asked for it once.
 *
 * Two steps rather than a system `Alert`: `Alert.alert` does nothing at all on
 * react-native-web, and the one control Play checks for is not a control that
 * may silently be missing on a platform.
 *
 * A founder is told what they are actually destroying. Their seat and their day
 * are the only things in this app that cannot be bought back — the day may be
 * taken by somebody else within the hour, and seat numbers are never reissued —
 * so the warning names them instead of saying "this cannot be undone".
 */
export const DeleteAccountRow = memo(function DeleteAccountRow() {
  const busy = useAuthStore((s) => s.busy);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const seat = useFoundersStore((s) => s.status.seat);
  const [asked, setAsked] = useState(false);

  if (!asked) {
    return (
      <PressableScale
        onPress={() => setAsked(true)}
        style={styles.ask}
        accessibilityLabel="Delete account"
      >
        <SegmentedText variant="caption" style={styles.askLabel}>
          Delete account
        </SegmentedText>
      </PressableScale>
    );
  }

  return (
    <View style={styles.confirm}>
      <SegmentedText variant="label" style={styles.heading}>
        Delete this account?
      </SegmentedText>
      {/* Plain Text, not SegmentedText: the caption variant caps at two lines
          and clipped the second sentence at 360dp even in the short version.
          The founder warning runs to six lines, and every one of them names
          something that does not come back. */}
      <Text style={styles.body}>
        {seat !== null
          ? 'Your founder seat and the day you keep are released. The day can be claimed by someone else, seat numbers are never given out twice, and neither comes back. Your purchase stays with your Google Play account.'
          : 'Your account and everything stored with it are removed. What is on this phone stays until you uninstall.'}
      </Text>
      <View style={styles.actions}>
        <PressableScale
          onPress={() => {
            void deleteAccount();
          }}
          style={styles.danger}
          accessibilityLabel="Yes, delete my account"
        >
          <SegmentedText variant="label" style={styles.dangerLabel}>
            {busy ? 'Deleting…' : 'Yes, delete it'}
          </SegmentedText>
        </PressableScale>
        <PressableScale
          onPress={() => setAsked(false)}
          style={styles.cancel}
          accessibilityLabel="Keep my account"
        >
          <SegmentedText variant="label" style={styles.cancelLabel}>
            Keep it
          </SegmentedText>
        </PressableScale>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  ask: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  askLabel: {
    color: palette.textTertiary,
    textDecorationLine: 'underline',
  },
  confirm: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.incorrect,
    backgroundColor: palette.void,
  },
  heading: {
    color: palette.textPrimary,
  },
  body: {
    ...type.caption,
    color: palette.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  danger: {
    borderWidth: 1,
    borderColor: palette.incorrect,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  dangerLabel: {
    color: palette.incorrect,
  },
  cancel: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  cancelLabel: {
    color: palette.textPrimary,
  },
});
