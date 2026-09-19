import { Image } from 'expo-image';
import { memo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PressableScale } from '@/components/primitives/PressableScale';
import { getAuthService } from '@/services/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * What the reader looks at while the archive arrives.
 *
 * There used to be a bare spinner on black here. That is a long time to show
 * nothing: the manifest is 16 MB and every one of its 8056 events goes through
 * Zod before the first card can be planned, which is seconds on a phone. A
 * black screen for seconds reads as a broken app.
 *
 * On the first launch it also offers an account, because this is the one
 * moment the reader is already waiting and nothing is being interrupted. The
 * offer never blocks: "Continue without an account" sits directly beneath it,
 * and the app is designed so a free reader is never prompted again.
 *
 * Once that question is answered — either way — it is not asked again, and
 * later launches show only the brand and the spinner.
 */
interface LaunchScreenProps {
  /** True once the archive is loaded and the feed could be shown. */
  ready: boolean;
  /** Whether to ask about an account, or simply wait for the archive. */
  offerAccount: boolean;
  onContinue: () => void;
}

export const LaunchScreen = memo(function LaunchScreen({
  ready,
  offerAccount,
  onContinue,
}: LaunchScreenProps) {
  const signIn = useAuthStore((s) => s.signIn);
  const answerLaunch = useOnboardingStore((s) => s.answerLaunch);
  const [busy, setBusy] = useState(false);

  const answer = (then?: () => Promise<unknown>) => async () => {
    setBusy(true);
    try {
      await then?.();
    } finally {
      answerLaunch();
      setBusy(false);
      onContinue();
    }
  };

  // The buttons appear only once the archive is in. Offering a choice while
  // the screen is still going to move under the reader's thumb is worse than
  // offering it a second later.
  const asking = offerAccount && ready && !busy;

  return (
    <View style={styles.screen}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.brand}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.mark}
          contentFit="contain"
          transition={200}
        />
        <Text style={styles.title}>History Unlocked</Text>
        <Text style={styles.tagline}>Today, but every year at once</Text>
      </Animated.View>

      <View style={styles.foot}>
        {asking ? (
          <Animated.View entering={FadeIn.duration(260)} style={styles.actions}>
            {getAuthService().available ? (
              <PressableScale
                onPress={() => void answer(signIn)()}
                style={styles.primary}
                accessibilityLabel="Sign in with Google"
              >
                <Text style={styles.primaryLabel}>Sign in with Google</Text>
              </PressableScale>
            ) : null}
            <PressableScale
              onPress={() => void answer()()}
              style={styles.secondary}
              accessibilityLabel="Continue without an account"
            >
              <Text style={styles.secondaryLabel}>Continue without an account</Text>
            </PressableScale>
            <Text style={styles.note}>An account is only for keeping your progress.</Text>
          </Animated.View>
        ) : (
          <View style={styles.loading}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.note}>Loading the archive…</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const MARK = 96;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.void,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  brand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: radius.pill,
  },
  title: {
    ...type.heroHeadline,
    textAlign: 'center',
  },
  tagline: {
    ...type.caption,
    textAlign: 'center',
  },
  foot: {
    width: '100%',
    minHeight: 150,
    justifyContent: 'flex-end',
  },
  loading: {
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
    alignItems: 'center',
  },
  primary: {
    width: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
  },
  primaryLabel: {
    ...type.label,
    color: palette.void,
    fontWeight: '700',
  },
  secondary: {
    width: '100%',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  secondaryLabel: {
    ...type.label,
    color: palette.textSecondary,
  },
  note: {
    ...type.caption,
    textAlign: 'center',
  },
});
