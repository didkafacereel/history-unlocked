import { useRouter } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { monthLabel } from '@/lib/dateKey';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { useEntitlementStore } from '@/stores/useEntitlementStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * Profile-screen Pro block: a membership badge for subscribers, an upsell card
 * for everyone else. Subscribes only to `isPro`. The __DEV__ toggle lets us
 * exercise both states without a billing account.
 */
function giftEnd(endsAt: number): string {
  const d = new Date(endsAt);
  return `${d.getDate()} ${monthLabel(d.getMonth() + 1)}`;
}

export const ProStatusPanel = memo(function ProStatusPanel() {
  const router = useRouter();
  const isPro = useEntitlementStore((s) => s.isPro);
  const purchased = useEntitlementStore((s) => s.purchased);
  const trialEndsAt = useEntitlementStore((s) => s.trialEndsAt);
  const restore = useEntitlementStore((s) => s.restore);
  const devTogglePro = useEntitlementStore((s) => s.devTogglePro);

  // Pro through the gift week, not a purchase: say so, with the date, and
  // make the card the way to keep it — the end of a free week is the moment a
  // reader knows exactly what they would be paying for.
  const inGiftWeek = isPro && !purchased && trialEndsAt !== null;

  return (
    <View style={styles.section}>
      <SegmentedText variant="label">Membership</SegmentedText>

      {inGiftWeek ? (
        <PressableScale
          onPress={() => router.push('/paywall')}
          style={styles.proCard}
          accessibilityLabel="Your free Pro week. See plans to keep Pro"
        >
          <Text style={styles.crest}>✦</Text>
          <View style={styles.proText}>
            <SegmentedText variant="fact" style={styles.proTitle}>
              Gift week of Pro
            </SegmentedText>
            <SegmentedText variant="caption">
              {`Everything unlocked until ${giftEnd(trialEndsAt)}. Keep it →`}
            </SegmentedText>
          </View>
        </PressableScale>
      ) : isPro ? (
        <View style={styles.proCard}>
          <Text style={styles.crest}>✦</Text>
          <View style={styles.proText}>
            <SegmentedText variant="fact" style={styles.proTitle}>
              Pro member
            </SegmentedText>
            <SegmentedText variant="caption">All eras, all features, unlocked.</SegmentedText>
          </View>
        </View>
      ) : (
        <PressableScale
          onPress={() => router.push('/paywall')}
          style={styles.upsell}
          accessibilityLabel="Unlock History Unlocked Pro"
        >
          <Text style={styles.crest}>✦</Text>
          <View style={styles.proText}>
            <SegmentedText variant="fact" style={styles.upsellTitle}>
              Unlock Pro
            </SegmentedText>
            {/* Names only what exists — see PRO_FEATURES for why. */}
            <SegmentedText variant="caption">
              Time machine, whole-archive search, every event & more.
            </SegmentedText>
          </View>
          <Text style={styles.chevron}>›</Text>
        </PressableScale>
      )}

      <View style={styles.links}>
        <PressableScale
          onPress={() => {
            void restore();
          }}
          accessibilityLabel="Restore purchases"
        >
          <SegmentedText variant="caption" style={styles.link}>
            Restore purchases
          </SegmentedText>
        </PressableScale>

        {__DEV__ ? (
          <>
            <PressableScale
              onPress={() => useOnboardingStore.getState().resetOnboarding()}
              accessibilityLabel="Developer: show the welcome again"
            >
              <SegmentedText variant="caption" style={styles.devLink}>
                DEV: replay intro
              </SegmentedText>
            </PressableScale>
            <PressableScale
              onPress={() => {
                void devTogglePro();
              }}
              accessibilityLabel="Developer: toggle Pro"
            >
              <SegmentedText variant="caption" style={styles.devLink}>
                {`DEV: ${purchased ? 'disable' : 'enable'} Pro`}
              </SegmentedText>
            </PressableScale>
          </>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  proCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.accentDim,
    borderWidth: 1,
    borderColor: palette.accent,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  upsell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  crest: {
    fontSize: 22,
    color: palette.accent,
    width: 28,
    textAlign: 'center',
  },
  proText: {
    flex: 1,
    gap: 1,
  },
  proTitle: {
    color: palette.accent,
    fontWeight: '800',
  },
  upsellTitle: {
    color: palette.textPrimary,
    fontWeight: '700',
  },
  chevron: {
    color: palette.textTertiary,
    fontSize: 22,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  link: {
    color: palette.textSecondary,
  },
  devLink: {
    color: palette.accent,
  },
});
