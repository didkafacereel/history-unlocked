import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PressableScale } from '@/components/primitives/PressableScale';
import { COLLECTIONS } from '@/config/collections';
import { prominence } from '@/data/deckPlan';
import { getAuthService } from '@/services/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { useIsPro } from '@/stores/useEntitlementStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

import { LaunchTile } from './LaunchTile';

/**
 * Hand-made art for the tiles, when there is any.
 *
 * Each entry is either a `require(...)` of a file under assets/images or
 * undefined, in which case the tile borrows a picture from today's archive.
 * Drop a file in, point the entry at it, and nothing else changes — the
 * fallback stays for whichever tiles are still unset.
 *
 *   today: require('@/assets/images/tile-today.jpg'),
 *
 * Landscape, at least 800px wide. The tile is a 116px band with a gradient
 * over the foot of it, so anything with its subject low down will be covered
 * by the words.
 */
/**
 * Pictures that are fine on a card but wrong as a tile.
 *
 * The archive still holds a few hundred flags, seals, logos and locator maps,
 * and the launch screen is the worst place to meet one: the first tiles it
 * built showed the French Army's logo and the title card of a 1980s sitcom.
 *
 * `.svg.png` is refused here although the pipeline's own `isSymbolImage`
 * deliberately allows it — historical maps and machine schematics are vectors
 * too, so being one says nothing about whether it depicts an event. As
 * DECORATION the odds run the other way: a vector on Commons is a logo, a
 * seal or a diagram almost every time. The pipeline draws the same line in
 * `replacementFault`, for the same reason.
 */
const DECORATIVE =
  /\.svg\.png$|logo|seal|emblem|coat[_ ]of[_ ]arms|flag[_ ]of|locator|blank[_ ]map|title[_ ]card/i;

function usableAsArt(imageUrl: string): boolean {
  let file = imageUrl.split('/').pop() ?? '';
  try {
    file = decodeURIComponent(file);
  } catch {
    // A lone percent sign in a Commons filename throws here; the raw name is
    // still good enough to test.
  }
  return !DECORATIVE.test(file);
}

const TILE_ART: Record<'today' | 'scenarios' | 'museum' | 'pro', number | undefined> = {
  today: undefined,
  scenarios: undefined,
  museum: undefined,
  pro: undefined,
};

/**
 * The screen the app opens on: what is waiting today, and a way into each of
 * it.
 *
 * It began as a fix for a black screen — the manifest is 16 MB and all 8056
 * events go through Zod before the first card can be planned, which is seconds
 * on a phone, and a bare spinner for that long reads as a broken app. It is
 * now also the answer to the quiz being hard to find: the scenarios have their
 * own way in from the first thing anyone sees, rather than sitting behind the
 * whole day.
 *
 * While the archive loads there is nothing to choose between, so the tiles are
 * absent and the brand fills the wait. They appear when the day is known, with
 * their own counts and their own pictures taken from it.
 *
 * On the very first launch it also offers an account, quietly and underneath —
 * the app is built so a free reader is never required to sign in, and a full
 * screen demanding one would contradict what the account panel says in writing.
 */
interface LaunchScreenProps {
  /** True once the archive is loaded and the day can be described. */
  ready: boolean;
  /** Whether to offer an account, or simply show the way in. */
  offerAccount: boolean;
  onContinue: () => void;
}

export const LaunchScreen = memo(function LaunchScreen({
  ready,
  offerAccount,
  onContinue,
}: LaunchScreenProps) {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const answerLaunch = useOnboardingStore((s) => s.answerLaunch);
  const dayEvents = useFeedStore((s) => s.dayEvents);
  const lockedCount = useFeedStore((s) => s.lockedCount);
  const isPro = useIsPro();
  const [busy, setBusy] = useState(false);

  /*
   * Three pictures from today, chosen rather than taken in order.
   *
   * The first attempt used dayEvents[0..2] and the Museum tile came up with a
   * locator map: the archive still holds a few hundred flags, seals and maps,
   * and on a wide tile they look like a rendering fault. Landscape first,
   * because a tall portrait cover-cropped to a 116px band shows a chin; then
   * by prominence, which is the same ranking the feed uses to pick the day's
   * lead, so the strongest material rises.
   */
  const art = useMemo(() => {
    const ranked = dayEvents
      .filter((e) => e.imageUrl && usableAsArt(e.imageUrl))
      .slice()
      .sort((a, b) => {
        const wide = Number((b.imageAspect ?? 1) > 1.2) - Number((a.imageAspect ?? 1) > 1.2);
        return wide !== 0 ? wide : prominence(b) - prominence(a);
      });
    return ranked.map((e) => e.imageUrl);
  }, [dayEvents]);

  const authored = dayEvents.filter((e) => e.authored === true || e.quizPool.length > 0).length;

  const enter = (go: () => void) => () => {
    // Answering here too: reaching the app IS an answer to "do you want an
    // account", and asking again next launch would be nagging.
    answerLaunch();
    onContinue();
    go();
  };

  const withAccount = async () => {
    setBusy(true);
    try {
      await signIn();
    } finally {
      setBusy(false);
      answerLaunch();
      onContinue();
    }
  };

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

      {ready ? (
        <Animated.View entering={FadeIn.duration(320)} style={styles.foot}>
          <ScrollView
            contentContainerStyle={styles.tiles}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <LaunchTile
              glyph="📅"
              title="On this day"
              subtitle={`${dayEvents.length} events recorded today`}
              image={TILE_ART.today ?? art[0]}
              onPress={enter(() => {})}
            />
            <LaunchTile
              glyph="🦋"
              title="Today’s scenarios"
              subtitle={
                authored > 0
                  ? `${authored} written scenarios today`
                  : 'Decide what you would have done'
              }
              image={TILE_ART.scenarios ?? art[1]}
              onPress={enter(() => router.push('/quiz'))}
            />
            <LaunchTile
              glyph="🏛"
              title="The Museum"
              subtitle={`${COLLECTIONS.length} collections to fill`}
              image={TILE_ART.museum ?? art[2]}
              onPress={enter(() => router.push('/collections'))}
            />

            {isPro ? null : (
              <LaunchTile
                glyph="✦"
                title="History Unlocked Pro"
                subtitle={
                  lockedCount > 0
                    ? `${lockedCount} more events locked today`
                    : 'Every date, every scenario, recall drills'
                }
                image={TILE_ART.pro ?? art[3]}
                highlight
                onPress={enter(() => router.push('/paywall'))}
              />
            )}

            {offerAccount && getAuthService().available ? (
              <PressableScale
                onPress={() => void withAccount()}
                style={styles.account}
                accessibilityLabel="Sign in with Google to keep your progress"
              >
                {busy ? (
                  <ActivityIndicator color={palette.textSecondary} />
                ) : (
                  <Text style={styles.accountLabel}>
                    Sign in to keep your progress — not required
                  </Text>
                )}
              </PressableScale>
            ) : null}
          </ScrollView>
        </Animated.View>
      ) : (
        <View style={styles.foot}>
          <View style={styles.loading}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.note}>Loading the archive…</Text>
          </View>
        </View>
      )}
    </View>
  );
});

const MARK = 88;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.void,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
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
    flex: 1,
    justifyContent: 'center',
  },
  tiles: {
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  loading: {
    alignItems: 'center',
    gap: spacing.md,
  },
  account: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  accountLabel: {
    ...type.caption,
    textAlign: 'center',
  },
  note: {
    ...type.caption,
    textAlign: 'center',
  },
});
