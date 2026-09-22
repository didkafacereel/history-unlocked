import { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { getAuthService } from '@/services/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { useFoundersStore } from '@/stores/useFoundersStore';
import { useAnsweredCount } from '@/stores/useQuizHistoryStore';
import { formatCount } from '@/lib/formatCount';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

import { EmailSignInRow } from './EmailSignInRow';

/**
 * Signing in — offered, never demanded.
 *
 * The copy changes with what the reader actually stands to lose. A free reader
 * is told plainly that they do not need this; a founder is told that their seat
 * and their day are what an account protects. A generic "Sign in to sync!" would
 * push the people who gain nothing and under-warn the one person whose loss
 * would be irreversible.
 */
export const AccountPanel = memo(function AccountPanel() {
  const user = useAuthStore((s) => s.user);
  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);
  const seat = useFoundersStore((s) => s.status.seat);
  const answered = useAnsweredCount();

  const service = getAuthService();

  if (!service.available) {
    return (
      <View style={styles.panel}>
        <SegmentedText variant="label">Account</SegmentedText>
        <SegmentedText variant="caption">
          Signing in is available in the phone app.
        </SegmentedText>
      </View>
    );
  }

  if (user) {
    return (
      <View style={styles.panel}>
        <SegmentedText variant="label">Account</SegmentedText>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.initial}>
              {(user.name || user.email).trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.identity}>
            <SegmentedText variant="fact" style={styles.name}>
              {user.name || user.email}
            </SegmentedText>
            <SegmentedText variant="caption">
              {seat !== null
                ? 'Your seat and your day follow this account to any phone.'
                : 'Your purchase follows this account to any phone.'}
            </SegmentedText>
            {answered > 0 ? (
              <SegmentedText variant="caption">
                {`${formatCount(answered)} questions answered — you won’t be asked them again.`}
              </SegmentedText>
            ) : null}
          </View>
        </View>

        {service.isStub ? (
          <SegmentedText variant="caption" style={styles.stub}>
            Local test account — real sign-in needs a build with Google credentials.
          </SegmentedText>
        ) : null}

        <PressableScale
          onPress={() => {
            void signOut();
          }}
          style={styles.ghost}
          accessibilityLabel="Sign out"
        >
          <SegmentedText variant="label" style={styles.ghostLabel}>
            {busy ? 'Signing out…' : 'Sign out'}
          </SegmentedText>
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <SegmentedText variant="label">Account</SegmentedText>
      <Text style={styles.pitch}>
        {seat !== null
          ? 'Your founder seat and the day you keep live on this device only. Sign in and they follow you to your next phone.'
          : 'You don’t need an account to read. Sign in only if you want a purchase to survive a new phone.'}
      </Text>

      {/* Concrete, and only once there is something to lose — "sign in to sync"
          with nothing behind it is the pitch everyone has learned to ignore. */}
      {answered > 0 ? (
        <SegmentedText variant="caption">
          {`${formatCount(answered)} answered questions are on this device. Signing in keeps them from coming round again on your next phone.`}
        </SegmentedText>
      ) : null}

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
        style={seat !== null ? { ...styles.cta, ...styles.ctaUrgent } : styles.cta}
        accessibilityLabel="Sign in with Google"
      >
        {busy ? (
          <ActivityIndicator color={seat !== null ? palette.void : palette.textPrimary} size="small" />
        ) : (
          <SegmentedText
            variant="label"
            style={seat !== null ? styles.ctaUrgentLabel : styles.ctaLabel}
          >
            Sign in with Google
          </SegmentedText>
        )}
      </PressableScale>

      {/* Offered only where it can actually work. The stand-in has no mailbox,
          and a form that posts nothing is worse than no form. */}
      {service.sendEmailLink ? <EmailSignInRow /> : null}
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.accentDim,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.accent,
  },
  initial: {
    ...type.label,
    color: palette.accent,
  },
  identity: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    color: palette.textPrimary,
    fontWeight: '700',
  },
  pitch: {
    ...type.fact,
    color: palette.textSecondary,
  },
  error: {
    color: palette.incorrect,
  },
  stub: {
    color: palette.textTertiary,
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
  // A founder has something to lose, so the button stops being quiet.
  ctaUrgent: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  ctaUrgentLabel: {
    color: palette.void,
  },
  ghost: {
    alignSelf: 'flex-start',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  ghostLabel: {
    color: palette.textTertiary,
  },
});
