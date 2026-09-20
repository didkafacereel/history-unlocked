import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { memo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PressableScale } from '@/components/primitives/PressableScale';
import { COLLECTIONS } from '@/config/collections';
import { getAuthService } from '@/services/auth';
import { useAuthStore } from '@/stores/useAuthStore';
import { useIsPro } from '@/stores/useEntitlementStore';
import { useFeedStore } from '@/stores/useFeedStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

import { LaunchDateLine } from './LaunchDateLine';
import { LaunchTile } from './LaunchTile';

/**
 * The art for the tiles: commissioned, bundled, and the same every day.
 *
 * These were drawn for this screen — 1400×600, the subject in the upper two
 * thirds because the tile is a 116px band with a gradient over the foot of it,
 * and the same lamp-lit palette across all four so the screen reads as one
 * place rather than four.
 *
 * It used to take a picture from today's archive instead. That sounded better
 * than it was: the archive holds a few hundred flags, seals and locator maps,
 * so the tiles had to be filtered and ranked, and they still came up with the
 * French Army's logo and the title card of a 1980s sitcom. A tile is furniture,
 * not evidence — it should not change under the reader, and it is the one place
 * in this app where a picture is not making a claim about an event.
 */
const TILE_ART = {
  today: require('@/assets/images/tile-today.jpg') as number,
  scenarios: require('@/assets/images/tile-scenarios.jpg') as number,
  museum: require('@/assets/images/tile-museum.jpg') as number,
  pro: require('@/assets/images/tile-pro.jpg') as number,
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
      {/* The archive itself, as the room the app opens in.
          Every print in it is a real picture of a real event under a
          public-domain licence — see launch-backdrop.credits.md. The obvious
          way to make this image is to ask a model for "vintage photographs on
          a table", and what comes back contains an invented Apollo 11. This
          app's whole promise is that the picture matches the event; putting
          fabricated history on the front door would undo that before a reader
          has read a word. */}
      <Image
        source={require('@/assets/images/launch-backdrop.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={600}
      />
      {/* Readability, not decoration. The backdrop already carries a vignette
          baked in; this is the part that has to hold white text at full
          contrast over whichever print happens to land behind it.

          It ends on scrimBottom (0.92) rather than `palette.void`, which is
          opaque: ending on void turned the lower half of the screen into flat
          black and threw away two thirds of the picture. Faint texture between
          the tiles is the point. */}
      <LinearGradient
        colors={[palette.scrimTop, palette.scrimMid, palette.scrimBottom]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View entering={FadeIn.duration(400)} style={styles.brand}>
        {/* The mark shrinks once there is something to choose between.
            While the archive loads it is the whole screen and should be; the
            moment the tiles arrive it is competing with them for the fold, and
            measured on a 360x800 phone it lost the Pro tile entirely — that
            tile began at y=808 on an 800pt screen, so the offer existed and
            no one ever saw it. */}
        <Image
          source={require('@/assets/images/icon.png')}
          style={ready ? styles.markSmall : styles.mark}
          contentFit="contain"
          transition={200}
        />
        <Text style={styles.title}>History Unlocked</Text>
        <Text style={styles.tagline}>Today, but every year at once</Text>
        {ready ? <LaunchDateLine /> : null}
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
              image={TILE_ART.today}
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
              image={TILE_ART.scenarios}
              onPress={enter(() => router.push('/quiz'))}
            />
            <LaunchTile
              glyph="🏛"
              title="The Museum"
              subtitle={`${COLLECTIONS.length} collections to fill`}
              image={TILE_ART.museum}
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
                image={TILE_ART.pro}
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
const MARK_SMALL = 56;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.void,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: radius.pill,
  },
  markSmall: {
    width: MARK_SMALL,
    height: MARK_SMALL,
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
