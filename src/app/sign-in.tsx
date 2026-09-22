import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SignInControls } from '@/components/auth/SignInControls';
import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { goBack } from '@/lib/goBack';
import { useAuthStore } from '@/stores/useAuthStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * The one place in the app where an account is required rather than offered.
 *
 * Reading needs no account and a subscription needs no account. A founder seat
 * does, and the reason is not policy — it is what the thing being sold IS: a
 * numbered place and a permanent public name on one date of the year. Both have
 * to belong to somebody who can prove they are them, on a new phone, years from
 * now.
 *
 * It is also the fix for a way the purchase could fail with money already
 * taken. Buying while signed out gave RevenueCat an anonymous id; signing in
 * afterwards moved the purchase and announced it with a TRANSFER event the
 * server used to ignore, leaving the buyer with a 403 on the day they had just
 * paid for. The transfer is handled now — but not needing it at all is better
 * than handling it, and the account is wanted two taps later regardless.
 *
 * The cost is honest: a sign-in screen at the moment of the most expensive
 * purchase in the app will lose some buyers. It is preferable to the support
 * message that begins "I paid and it says I have to buy it".
 */
export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  // Back to wherever they came from the moment there is an account — which is
  // the paywall, still on the stack with the Lifetime package selected.
  useEffect(() => {
    if (user) {
      goBack(router);
    }
  }, [user, router]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <PressableScale onPress={() => goBack(router)} style={styles.back} accessibilityLabel="Back">
        <Text style={styles.backGlyph}>‹</Text>
      </PressableScale>

      <View style={styles.panel}>
        <SegmentedText variant="label">Before you claim a day</SegmentedText>
        <Text style={styles.lead}>
          A founder seat is numbered, and the day you keep carries your name for as long as
          the archive exists. Both belong to an account, so they survive this phone.
        </Text>
        <Text style={styles.detail}>
          No password either way. Nothing is sent to you except the sign-in link, if you
          choose that one.
        </Text>

        <SignInControls urgent />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.void,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  backGlyph: {
    ...type.headline,
    color: palette.textSecondary,
    fontSize: 28,
    lineHeight: 30,
  },
  panel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  lead: {
    ...type.fact,
    color: palette.textPrimary,
  },
  detail: {
    ...type.caption,
    color: palette.textSecondary,
  },
});
