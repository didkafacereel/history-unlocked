import { useRouter } from 'expo-router';
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

  const defaultId = useMemo(
    () => packages.find((p) => p.highlight)?.id ?? packages[0]?.id ?? null,
    [packages],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? defaultId;

  useEffect(() => {
    if (packages.length === 0) {
      void loadOfferings();
    }
  }, [packages.length, loadOfferings]);

  // Leaving the screen Pro (purchase or restore succeeded) returns to the app.
  // Via `goBack`, because a Pro reader who opens /paywall as a deep link has no
  // history behind it and a bare back() there leaves them on a blank screen.
  useEffect(() => {
    if (isPro) {
      goBack(router);
    }
  }, [isPro, router]);

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
          onPress={() => {
            if (activeId) {
              void purchase(activeId);
            }
          }}
          style={styles.cta}
          accessibilityLabel="Start Pro"
        >
          {purchasing ? (
            <ActivityIndicator color={palette.void} />
          ) : (
            <SegmentedText variant="label" style={styles.ctaLabel}>
              Unlock Pro
            </SegmentedText>
          )}
        </PressableScale>

        <PressableScale
          onPress={() => {
            void restore();
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
