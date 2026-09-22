import { useRouter } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { DAILY_QUESTIONS_FREE, DAILY_QUESTIONS_PRO } from '@/stores/useQuizStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * The offer at the end of the daily quiz, for a reader who has just answered
 * every question the free tier has.
 *
 * The feed has had its version of this since the depth wall was built and the
 * quiz never did — a free reader finished their eight questions and was handed
 * a button back to the feed, at the one moment they had just demonstrated they
 * wanted more of exactly this thing.
 *
 * Built on the depth wall's rule, which is the only reason that card works:
 * NAME THE NUMBER. "Unlock more questions" is a slogan and reads as noise;
 * "you answered 8, Pro asks 16" is a fact the reader can check against what
 * just happened to them. Both numbers come from the constants the quiz itself
 * draws from, so the claim cannot drift away from the product.
 *
 * Deliberately quiet: no crest, no gradient, no celebration. It sits under the
 * score as one more line of the debrief rather than a wall between the reader
 * and the way out, and "Return to the feed" stays the primary button. An offer
 * that has to be dismissed is a toll, and this is a shop window.
 */
export const QuizUpsellPanel = memo(function QuizUpsellPanel() {
  const router = useRouter();
  const more = DAILY_QUESTIONS_PRO - DAILY_QUESTIONS_FREE;

  return (
    <View style={styles.panel}>
      <SegmentedText variant="label" style={styles.kicker}>
        {`${more} more a day`}
      </SegmentedText>
      <Text style={styles.headline}>
        {`You answered ${DAILY_QUESTIONS_FREE}.\nPro is asked ${DAILY_QUESTIONS_PRO}.`}
      </Text>
      {/* No count of the archive's scenarios here. The paywall states one and
          it is checked against the manifest; a second copy in a second place
          is a second thing to be wrong after a rebuild. */}
      <SegmentedText variant="caption" style={styles.body}>
        And every written scenario in the archive, replayed as often as you like.
      </SegmentedText>

      <PressableScale
        onPress={() => router.push('/paywall')}
        style={styles.cta}
        accessibilityLabel={`See Pro, which asks ${DAILY_QUESTIONS_PRO} questions a day`}
      >
        <SegmentedText variant="label" style={styles.ctaLabel}>
          ✦ Double the daily quiz
        </SegmentedText>
      </PressableScale>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.accent,
    backgroundColor: palette.accentDim,
  },
  kicker: {
    color: palette.accent,
  },
  headline: {
    ...type.headline,
    fontSize: 20,
    lineHeight: 25,
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
  },
  cta: {
    marginTop: spacing.xs,
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  ctaLabel: {
    color: palette.void,
  },
});
