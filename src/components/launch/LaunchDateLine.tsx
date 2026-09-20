import { useRouter } from 'expo-router';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { monthLabel, parseDateKey, todayDateKey } from '@/lib/dateKey';
import { getFoundersService } from '@/services/founders';
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
 */
export const LaunchDateLine = memo(function LaunchDateLine() {
  const router = useRouter();
  const dateKey = todayDateKey();
  const [keepers, setKeepers] = useState<string[] | null>(null);

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
          {`Kept by ${keepers.join(' · ')}`}
        </Text>
      ) : (
        <PressableScale
          onPress={() => router.push('/paywall')}
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
