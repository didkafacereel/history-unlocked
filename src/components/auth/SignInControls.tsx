import { memo } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { getAuthService } from '@/services/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { palette, radius, spacing } from '@/theme/tokens';

import { EmailSignInRow } from './EmailSignInRow';

/**
 * The two ways in, and nothing else.
 *
 * Extracted from `AccountPanel` when the founder flow needed the same controls
 * under different copy: the profile offers signing in, while the Lifetime
 * purchase requires it. The buttons are identical and the sentence above them
 * is not, so the sentence stays with the caller.
 */
interface SignInControlsProps {
  /** Loud styling, for the screen where signing in is the only way forward. */
  urgent?: boolean;
}

export const SignInControls = memo(function SignInControls({ urgent }: SignInControlsProps) {
  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);

  return (
    <>
      {error ? (
        <SegmentedText variant="caption" style={styles.error}>
          {error === 'unavailable'
            ? 'Google Play services are not available on this device.'
            : 'Sign-in did not complete. Try again.'}
        </SegmentedText>
      ) : null}

      <PressableScale
        onPress={() => {
          void signIn();
        }}
        style={urgent ? { ...styles.cta, ...styles.ctaUrgent } : styles.cta}
        accessibilityLabel="Sign in with Google"
      >
        {busy ? (
          <ActivityIndicator color={urgent ? palette.void : palette.textPrimary} size="small" />
        ) : (
          <SegmentedText variant="label" style={urgent ? styles.ctaUrgentLabel : styles.ctaLabel}>
            Sign in with Google
          </SegmentedText>
        )}
      </PressableScale>

      {/* Offered only where it can actually work. The stand-in has no mailbox,
          and a form that posts nothing is worse than no form. */}
      {getAuthService().sendEmailLink ? <EmailSignInRow /> : null}
    </>
  );
});

const styles = StyleSheet.create({
  error: {
    color: palette.incorrect,
  },
  cta: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  ctaLabel: {
    color: palette.textPrimary,
  },
  ctaUrgent: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  ctaUrgentLabel: {
    color: palette.void,
  },
});
