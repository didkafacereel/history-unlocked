import { memo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useAuthStore } from '@/stores/useAuthStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * The second way in: an address, and a link in the post.
 *
 * Google alone was thin. An account here exists to carry a purchase and a
 * public name, and requiring a Google account to hold either turns away
 * everyone who keeps those things separate — which, for something permanent,
 * is a reasonable thing to want.
 *
 * No password, and not to save work: Firebase would have sent the reset mail
 * itself. A password is a thing to invent and remember for an account whose
 * only job is to carry one day and one purchase. A link proves the same thing
 * and leaves nothing behind to lose.
 *
 * The "check your inbox" state lives in the store, not here. The reader leaves
 * the app to fetch the link and this component unmounts behind them; coming
 * back to an empty form with no sign anything happened is how somebody asks
 * for a second link, and a third.
 */
export const EmailSignInRow = memo(function EmailSignInRow() {
  const busy = useAuthStore((s) => s.busy);
  const emailSent = useAuthStore((s) => s.emailSent);
  const emailError = useAuthStore((s) => s.emailError);
  const sendEmailLink = useAuthStore((s) => s.sendEmailLink);
  const clearEmailSent = useAuthStore((s) => s.clearEmailSent);
  const [email, setEmail] = useState('');

  if (emailSent) {
    return (
      <View style={styles.wrap}>
        <SegmentedText variant="label" style={styles.sentLabel}>
          Check your email
        </SegmentedText>
        {/* Plain Text: the address makes this longer than the caption cap of
            two lines, and the address is the whole point of the sentence. */}
        <Text style={styles.sentBody}>
          {`A sign-in link is on its way to ${emailSent}. Open it on this phone — the link only signs you in where it was asked for.`}
        </Text>
        <PressableScale
          onPress={clearEmailSent}
          style={styles.quiet}
          accessibilityLabel="Use a different email address"
        >
          <SegmentedText variant="caption" style={styles.quietLabel}>
            Use a different address
          </SegmentedText>
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <SegmentedText variant="caption">Or sign in with an email link — no password.</SegmentedText>

      <View style={styles.row}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={palette.textTertiary}
          style={styles.input}
          accessibilityLabel="Your email address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          inputMode="email"
          // The address is the whole form, so the keyboard's own button should
          // finish it rather than making the reader reach for a second target.
          returnKeyType="send"
          onSubmitEditing={() => void sendEmailLink(email)}
          editable={!busy}
        />
        <PressableScale
          onPress={() => void sendEmailLink(email)}
          style={styles.send}
          accessibilityLabel="Email me a sign-in link"
        >
          {busy ? (
            <ActivityIndicator color={palette.void} size="small" />
          ) : (
            <SegmentedText variant="label" style={styles.sendLabel}>
              Send
            </SegmentedText>
          )}
        </PressableScale>
      </View>

      {emailError ? (
        <SegmentedText variant="caption" style={styles.error}>
          {emailError === 'bad-email'
            ? 'That does not look like an email address.'
            : emailError === 'unavailable'
              ? 'Email sign-in is not available in this build.'
              : 'The link could not be sent. Try again in a moment.'}
        </SegmentedText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    ...type.fact,
    flex: 1,
    minWidth: 0,
    color: palette.textPrimary,
    backgroundColor: palette.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  send: {
    flexShrink: 0,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },
  sendLabel: {
    color: palette.void,
  },
  sentLabel: {
    color: palette.accent,
  },
  sentBody: {
    ...type.caption,
  },
  quiet: {
    alignSelf: 'flex-start',
    minHeight: 32,
    justifyContent: 'center',
  },
  quietLabel: {
    color: palette.textSecondary,
  },
  error: {
    color: palette.incorrect,
  },
});
