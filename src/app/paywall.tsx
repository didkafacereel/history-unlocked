import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FounderSeatsRow } from '@/components/paywall/FounderSeatsRow';
import { PackageCard } from '@/components/paywall/PackageCard';
import { PaywallFeatureRow } from '@/components/paywall/PaywallFeatureRow';
import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { PRO_FEATURES } from '@/config/pro';
import { goBack } from '@/lib/goBack';
import { useEntitlementStore } from '@/stores/useEntitlementStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/** The Pro paywall — the "something for everyone" pitch plus price options. */
export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isPro = useEntitlementStore((s) => s.isPro);
  const packages = useEntitlementStore((s) => s.packages);
  const purchasing = useEntitlementStore((s) => s.purchasing);
  const purchase = useEntitlementStore((s) => s.purchase);
  const restore = useEntitlementStore((s) => s.restore);
  const loadOfferings = useEntitlementStore((s) => s.loadOfferings);

  /**
   * `?plan=lifetime` arrives from a link that is already about one product.
   *
   * The launch screen's "claim this date" line is the case that needed it: a
   * date is a Lifetime privilege, so sending the reader here with the annual
   * plan selected — and the button reading "Unlock Pro" over the wrong price —
   * asks them to find the right card themselves. Unrecognised values fall
   * through to the normal default rather than selecting nothing.
   */
  const { plan } = useLocalSearchParams<{ plan?: string }>();

  const defaultId = useMemo(() => {
    const asked = plan === undefined ? undefined : packages.find((p) => p.period === plan);
    // A reader who is already Pro is here for the one thing they do not have.
    // Opening on the highlighted annual plan would arm the button to sell them
    // the subscription they are already paying for.
    const forPro = isPro ? packages.find((p) => p.period === 'lifetime') : undefined;
    return (
      asked?.id ?? forPro?.id ?? packages.find((p) => p.highlight)?.id ?? packages[0]?.id ?? null
    );
  }, [packages, plan, isPro]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? defaultId;

  useEffect(() => {
    if (packages.length === 0) {
      void loadOfferings();
    }
  }, [packages.length, loadOfferings]);

  /*
   * Leaving is a consequence of BUYING something here, not of being Pro.
   *
   * This used to be `useEffect(() => { if (isPro) goBack(router) })`, and it
   * was a dead end: a Pro subscriber is still not a founder, Lifetime is the
   * only way to keep a day, Lifetime is sold on this screen — and the screen
   * shut itself the instant it opened. Every route to it looked broken from
   * the outside, which is exactly how it was reported: "the button does
   * nothing". It did something. This closed it again before a frame was drawn.
   *
   * So the exits are explicit, on the two actions that can actually finish:
   * the purchase button and Restore. A Pro reader who opens this screen now
   * stays on it and can see what is left to buy.
   */
  const buy = async () => {
    if (!activeId) {
      return;
    }
    const bought = packages.find((p) => p.id === activeId);
    if (!(await purchase(activeId))) {
      return;
    }
    // A founder seat comes with a day to choose, and the moment just after
    // paying is when they want to choose it — not three taps into the profile
    // screen, whenever they happen to find it. `purchase` has already awaited
    // the seat allocation for a lifetime package, so the picker opens on a
    // reader the founders service already knows.
    if (bought?.period === 'lifetime') {
      router.replace('/keep-a-day');
      return;
    }
    goBack(router);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PressableScale
          onPress={() => goBack(router)}
          style={styles.close}
          accessibilityLabel="Close"
        >
          <Text style={styles.closeGlyph}>✕</Text>
        </PressableScale>

        <View style={styles.hero}>
          <View style={styles.crest}>
            <Text style={styles.crestGlyph}>✦</Text>
          </View>
          <Text style={styles.title}>History Unlocked Pro</Text>
          <SegmentedText variant="caption" style={styles.tagline}>
            From antiquity to today — the whole story, for everyone.
          </SegmentedText>
        </View>

        <View style={styles.features}>
          {PRO_FEATURES.map((f) => (
            <PaywallFeatureRow key={f.title} {...f} />
          ))}
        </View>

        <FounderSeatsRow />

        <View style={styles.packages}>
          {packages.length === 0 ? (
            <ActivityIndicator color={palette.accent} />
          ) : (
            packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                selected={pkg.id === activeId}
                onSelect={setSelectedId}
              />
            ))
          )}
        </View>

        <PressableScale
          onPress={() => void buy()}
          style={styles.cta}
          accessibilityLabel="Start Pro"
        >
          {purchasing ? (
            <ActivityIndicator color={palette.void} />
          ) : (
            <SegmentedText variant="label" style={styles.ctaLabel}>
              {/* "Unlock Pro" is wrong for someone who already has it. The
                  only purchase left for a subscriber is the founder seat, and
                  the button should say which one it is about to make. */}
              {isPro && packages.find((p) => p.id === activeId)?.period === 'lifetime'
                ? 'Become a founder'
                : 'Unlock Pro'}
            </SegmentedText>
          )}
        </PressableScale>

        <PressableScale
          onPress={() => {
            void restore().then((ok) => {
              if (ok) {
                goBack(router);
              }
            });
          }}
          style={styles.restore}
          accessibilityLabel="Restore purchases"
        >
          <SegmentedText variant="caption" style={styles.restoreLabel}>
            Restore purchases
          </SegmentedText>
        </PressableScale>

        <Text style={styles.fine}>
          Subscriptions renew automatically until cancelled. Manage or cancel anytime in your
          store account. Lifetime is a single payment: it never renews, and it covers the
          whole archive plus every Pro feature listed above, for as long as the app exists.
        </Text>
      </ScrollView>
    </View>
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
  close: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.inkRaised,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  closeGlyph: {
    color: palette.textSecondary,
    fontSize: 16,
    lineHeight: 18,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  crest: {
    width: 76,
    height: 76,
    borderRadius: radius.pill,
    backgroundColor: palette.accentDim,
    borderWidth: 1,
    borderColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  crestGlyph: {
    fontSize: 34,
    color: palette.accent,
  },
  title: {
    ...type.headline,
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
  },
  features: {
    gap: spacing.lg,
  },
  packages: {
    gap: spacing.md,
  },
  cta: {
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  ctaLabel: {
    color: palette.void,
  },
  restore: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
  restoreLabel: {
    color: palette.textSecondary,
  },
  fine: {
    ...type.caption,
    fontSize: 11,
    color: palette.textTertiary,
    textAlign: 'center',
  },
});
