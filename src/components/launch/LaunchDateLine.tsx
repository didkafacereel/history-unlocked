import { useRouter } from 'expo-router';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { monthLabel, parseDateKey, todayDateKey } from '@/lib/dateKey';
import { getFoundersService, lifetimeIsSellable } from '@/services/founders';
import { useFoundersStore } from '@/stores/useFoundersStore';
import { palette, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * Today's date on the launch screen, and who is keeping it.
 *
 * A founder claims one date of the year and their name sits with it — the
 * privilege already exists, this only shows it at the front door instead of
 * only at the foot of that day's register.
 *
 * "Kept by", not "sponsored by", and the difference is not cosmetic. This app
 * is asking to be believed about the past; a date announced as sponsored
 * invites the reader to wonder what the sponsor paid for, and the honest
 * answer — nothing, they bought a name on a day — is not the one the word
 * suggests. "Kept" is also what the feature is called everywhere else in the
 * code and the paywall, and one thing with two names is how a product starts
 * lying to itself.
 *
 * The prompt to claim it appears only when the day is free. KeptByLine makes
 * the opposite choice in the register, deliberately: the archive's own voice
 * should not advertise. The launch screen already carries the Pro tile, so an
 * offer here is in keeping.
 *
 * Where the prompt GOES depends on what the reader already owns, because a day
 * is not sold on its own — it is a Lifetime privilege, claimed afterwards:
 *
 *   not a founder  → the paywall, with Lifetime already selected
 *   founder, no day → the claim form, opened on this date
 *   founder with a day → no prompt at all; they have spent their one claim
 *
 * Sending all three to `/paywall` was the previous behaviour and was wrong for
 * two of them: a founder who taps "claim it" and is shown a price for
 * something they already bought has been told the app does not know them.
 */
export const LaunchDateLine = memo(function LaunchDateLine() {
  const router = useRouter();
  const dateKey = todayDateKey();
  const [keepers, setKeepers] = useState<string[] | null>(null);
  const seat = useFoundersStore((s) => s.status.seat);
  const keptDate = useFoundersStore((s) => s.status.keptDate);

  useEffect(() => {
    let active = true;
    void getFoundersService()
      .keepersFor(dateKey)
      .then((names) => {
        if (active) {
          setKeepers(names);
        }
      })
      .catch(() => {
        // No founders backend, or it is down. The date still shows; only the
        // line under it is unknown, and an unknown line is simply absent.
        if (active) {
          setKeepers([]);
        }
      });
    return () => {
      active = false;
    };
  }, [dateKey]);

  const { month, day } = parseDateKey(dateKey);
  const date = `${day} ${monthLabel(month)}`;

  return (
    <View style={styles.wrap}>
      <Text style={styles.date}>{date}</Text>

      {keepers === null ? null : keepers.length > 0 ? (
        /**
         * The name is the headline of the line, not a caption under the date.
         *
         * It used to be 13px grey — "Kept by Ada Lovelace" read like a
         * footnote, on the one screen every reader sees every day. The name is
         * what a founder paid for and what the next reader should want, so it
         * is gold, heavy and large, with a soft halo, and "Kept by" steps down
         * to a small label above it.
         *
         * Sized by the name's length rather than left to `adjustsFontSizeToFit`
         * alone: that prop does nothing on web, and the first version of this
         * ran a 28-character name — the most the register allows — off both
         * edges of a 360dp screen. Short names get the full size; long ones
         * step down so the whole name always fits. "Ada Love…" on the front
         * door would be worse than a slightly smaller whole name.
         */
        <View style={styles.keptBlock} accessibilityLabel={`Kept by ${keepers[0] ?? ''}`}>
          <Text style={styles.keptLabel}>Kept by</Text>
          <Text
            style={[styles.keeperName, keeperNameSize(keepers[0] ?? '')]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {keepers[0] ?? ''}
          </Text>
        </View>
      ) : keptDate !== null || !lifetimeIsSellable() ? null : (
        <PressableScale
          // The object form, not `/paywall?plan=lifetime`. Both are legal
          // hrefs, but the string form leaves the query to be parsed out of a
          // path and that is the one part of this that behaved differently on
          // the device than in the browser. `params` is unambiguous, and it
          // also means no hand-rolled encodeURIComponent.
          onPress={() => {
            router.push(
              seat === null
                ? { pathname: '/paywall', params: { plan: 'lifetime' } }
                : { pathname: '/keep-a-day', params: { date: dateKey } },
            );
          }}
          style={styles.claim}
          accessibilityLabel={`Keep ${date} in your name`}
        >
          <Text style={styles.claimLabel} numberOfLines={1}>
            {`Nobody keeps ${date} yet — claim it`}
          </Text>
        </PressableScale>
      )}
    </View>
  );
});

/**
 * Font size for a keeper's name, stepped by length.
 *
 * Bold sans averages a little under 0.6em per character. The tiers keep the
 * widest name in each band under ~300dp — what a 360dp phone leaves after the
 * screen's padding — so the register's 28-character maximum still fits whole.
 */
function keeperNameSize(name: string): { fontSize: number; lineHeight: number } {
  const length = name.length;
  if (length <= 14) {
    return { fontSize: 28, lineHeight: 36 };
  }
  if (length <= 19) {
    return { fontSize: 24, lineHeight: 32 };
  }
  if (length <= 23) {
    return { fontSize: 21, lineHeight: 28 };
  }
  return { fontSize: 18, lineHeight: 26 };
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 2,
  },
  date: {
    ...type.label,
    color: palette.accent,
  },
  keptBlock: {
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  keptLabel: {
    ...type.label,
    fontSize: 11,
    letterSpacing: 2,
  },
  keeperName: {
    maxWidth: '100%',
    fontWeight: '800',
    letterSpacing: 0.2,
    color: palette.accent,
    textAlign: 'center',
    textShadowColor: palette.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  claim: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  claimLabel: {
    ...type.caption,
    color: palette.textTertiary,
    textAlign: 'center',
  },
});
