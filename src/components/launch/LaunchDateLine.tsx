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
        <Text style={styles.kept} numberOfLines={1}>
          {`Kept by ${keepers[0] ?? ''}`}
        </Text>
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

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 2,
  },
  date: {
    ...type.label,
    color: palette.accent,
  },
  kept: {
    ...type.caption,
    textAlign: 'center',
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
