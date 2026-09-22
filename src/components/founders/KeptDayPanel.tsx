import { useRouter } from 'expo-router';
import { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import {
  getFoundersService,
  KEEPERS_PER_DATE,
  KEEPER_CHANGE_NOTE,
  KEEPER_REFRESH_NOTE,
} from '@/services/founders';
import {
  makeDateKey,
  monthLabel,
  parseDateKey,
  shortDateKeyLabel,
  daysInMonth,
  todayDateKey,
} from '@/lib/dateKey';
import { checkKeeperName, keeperNameMessage, MAX_NAME } from '@/lib/keeperName';
import { useIsPro } from '@/stores/useEntitlementStore';
import { useFoundersStore } from '@/stores/useFoundersStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

import { FounderBadge } from './FounderBadge';

/**
 * Keep a day.
 *
 * A founder claims one calendar date and their name sits at the foot of that
 * date's register, every year. One name per date: the day is theirs, not a
 * line on a shared list. It is the one privilege this app can offer that no
 * other app can copy, because the product IS a calendar — and the ceiling is
 * honest rather than invented: there are 366 days and that is how many there
 * will ever be.
 *
 * Claiming is deliberately one-way and stated as such before the button. A day
 * you can swap next week is a setting; a day you choose once is a decision.
 */

interface KeptDayPanelProps {
  /**
   * The date the picker opens on, "MM-DD". Defaults to today.
   *
   * Set when the reader arrived from a link about one particular date — the
   * launch screen offers the day it is showing, and opening the picker on some
   * other date would make them step back to the one they tapped.
   */
  initialDateKey?: string;
}

export const KeptDayPanel = memo(function KeptDayPanel({ initialDateKey }: KeptDayPanelProps) {
  const router = useRouter();
  const isPro = useIsPro();
  const seat = useFoundersStore((s) => s.status.seat);
  const keptDate = useFoundersStore((s) => s.status.keptDate);
  const claimDate = useFoundersStore((s) => s.claimDate);

  const opening = initialDateKey === undefined ? todayDateKey() : initialDateKey;
  const [month, setMonth] = useState(() => parseDateKey(opening).month);
  const [day, setDay] = useState(() => parseDateKey(opening).day);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Availability for the date currently under the picker, keyed by the date it
  // answers so a slow lookup can never describe a date the reader has left.
  const [availability, setAvailability] = useState<{ dateKey: string; taken: number } | null>(
    null,
  );

  // Computed before the early returns below, because the lookup effect is a
  // hook and hooks cannot sit after a conditional return.
  const maxDay = daysInMonth(month);
  const safeDay = Math.min(day, maxDay);
  const dateKey = makeDateKey(month, safeDay);

  // Ask how full the date under the picker is, as the picker moves. Finding out
  // a birthday is full only AFTER pressing the one-way claim button is the
  // wrong moment to learn it.
  useEffect(() => {
    if (seat === null || keptDate !== null) {
      return;
    }
    let active = true;
    void getFoundersService()
      .checkDate(dateKey)
      .then((found) => {
        if (active) {
          setAvailability({ dateKey, taken: found.keepers.length });
        }
      });
    return () => {
      active = false;
    };
  }, [dateKey, seat, keptDate]);

  // Not a founder: this is the pitch, not the form.
  if (seat === null) {
    return (
      <PressableScale
        onPress={() => router.push({ pathname: '/paywall', params: { plan: 'lifetime' } })}
        style={styles.panel}
        accessibilityLabel="Keep a day in history — a Lifetime privilege"
      >
        <SegmentedText variant="label">Keep a day</SegmentedText>
        <Text style={styles.pitch}>
          Lifetime founders claim one date in the calendar. Their name stays at the foot
          of that day’s register — every year, for as long as the archive exists.
        </Text>
        <SegmentedText variant="caption">
          {isPro ? '✦ Included with Lifetime' : '✦ Lifetime only'}
        </SegmentedText>
      </PressableScale>
    );
  }

  // A founder who has already chosen: the day is theirs, and that is the panel.
  if (keptDate) {
    return (
      <View style={styles.panel}>
        <SegmentedText variant="label">Your day</SegmentedText>
        <Text style={styles.keptDate}>{shortDateKeyLabel(keptDate)}</Text>
        <SegmentedText variant="caption">
          Yours alone. Your name sits at the foot of this day’s register, every year.
        </SegmentedText>
        {/* Said here because this is the screen a new founder is looking at
            when they wonder why the day does not carry their name yet. */}
        <SegmentedText variant="caption">{KEEPER_REFRESH_NOTE}</SegmentedText>
        <FounderBadge compact />
        <RegisterLink />
      </View>
    );
  }

  const known = availability?.dateKey === dateKey ? availability.taken : null;
  const full = known !== null && known >= KEEPERS_PER_DATE;

  const onClaim = async () => {
    // Checked here so the reader is told which rule they met and why, rather
    // than watching a request fail. The server checks again and is the one
    // that decides — this copy exists to be quick, not to be trusted.
    const checked = checkKeeperName(name);
    if (!checked.ok) {
      setError(keeperNameMessage(checked.reason ?? 'too-short'));
      return;
    }
    setBusy(true);
    setError(null);
    const result = await claimDate(dateKey, checked.value);
    setBusy(false);
    if (result === 'taken') {
      setAvailability({ dateKey, taken: KEEPERS_PER_DATE });
      setError(`${shortDateKeyLabel(dateKey)} was taken. Pick another day.`);
    } else if (result === 'failed') {
      setError('Could not reach the archive. Try again in a moment.');
    }
  };

  return (
    <View style={styles.panel}>
      <SegmentedText variant="label">Claim your day</SegmentedText>
      {/* Plain Text, not SegmentedText: the caption variant caps at two lines
          and this runs to three on a 360dp phone. Clipping the sentence that
          names the only way to correct a one-way choice would defeat it. */}
      <Text style={styles.changeNote}>{KEEPER_CHANGE_NOTE}</Text>
      {/* Before the choice, not only after it. Stepping the pickers one day at
          a time to find a free date is the slow way to read a calendar. */}
      <RegisterLink />

      <View style={styles.pickers}>
        <Stepper
          label={monthLabel(month)}
          onBack={() => setMonth((m) => ((m - 2 + 12) % 12) + 1)}
          onNext={() => setMonth((m) => (m % 12) + 1)}
          accessibilityLabel="Month"
        />
        <Stepper
          label={String(safeDay)}
          onBack={() => setDay(safeDay === 1 ? maxDay : safeDay - 1)}
          onNext={() => setDay(safeDay === maxDay ? 1 : safeDay + 1)}
          accessibilityLabel="Day"
        />
      </View>

      <SegmentedText
        variant="caption"
        style={full ? styles.error : known !== null ? styles.free : undefined}
      >
        {known === null
          ? 'Checking who keeps this day…'
          : full
            ? `${shortDateKeyLabel(dateKey)} already has a keeper.`
            : `${shortDateKeyLabel(dateKey)} is free.`}
      </SegmentedText>

      <TextInput
        value={name}
        onChangeText={(next) => {
          setName(next);
          setError(null);
        }}
        placeholder="The name on the day"
        placeholderTextColor={palette.textTertiary}
        maxLength={MAX_NAME}
        autoCapitalize="words"
        autoCorrect={false}
        style={styles.input}
        accessibilityLabel="The name shown on your day"
      />

      {/* Said where it is typed, not only in the pitch above. This name is
          published — to every reader, in the register and in the archive — and
          a permanent public disclosure that is only mentioned on the screen
          that sold the tier is a disclosure somebody can reach this box
          without having read. It also does not have to be their real name,
          which is worth saying before they assume it does. */}
      <Text style={styles.changeNote}>
        Anyone can see this name on your day. It need not be your real one.
      </Text>

      {error ? (
        <SegmentedText variant="caption" style={styles.error}>
          {error}
        </SegmentedText>
      ) : null}

      <PressableScale
        onPress={() => {
          // Kept pressable when full rather than disabled: a dead button
          // explains nothing, and the message names the actual problem.
          if (full) {
            setError(`${shortDateKeyLabel(dateKey)} is taken. Step to another day.`);
            return;
          }
          void onClaim();
        }}
        style={full ? { ...styles.claim, ...styles.claimFull } : styles.claim}
        accessibilityLabel={
          full ? `${shortDateKeyLabel(dateKey)} is full` : `Keep ${shortDateKeyLabel(dateKey)}`
        }
      >
        <SegmentedText variant="label" style={full ? styles.claimFullLabel : styles.claimLabel}>
          {busy ? 'Claiming…' : full ? 'Day is full' : `Keep ${shortDateKeyLabel(dateKey)}`}
        </SegmentedText>
      </PressableScale>
    </View>
  );
});

/** Way into the register of days — every date and who holds it. */
const RegisterLink = memo(function RegisterLink() {
  const router = useRouter();
  return (
    <PressableScale
      onPress={() => router.push('/keepers')}
      style={styles.register}
      accessibilityLabel="See every day and who keeps it"
    >
      <SegmentedText variant="label" style={styles.registerLabel}>
        See the whole year ›
      </SegmentedText>
    </PressableScale>
  );
});

interface StepperProps {
  label: string;
  onBack: () => void;
  onNext: () => void;
  accessibilityLabel: string;
}

const Stepper = memo(function Stepper({ label, onBack, onNext, accessibilityLabel }: StepperProps) {
  return (
    <View style={styles.stepper}>
      <PressableScale onPress={onBack} style={styles.step} accessibilityLabel={`Previous ${accessibilityLabel}`}>
        <Text style={styles.stepGlyph}>‹</Text>
      </PressableScale>
      <Text style={styles.stepValue} numberOfLines={1}>
        {label}
      </Text>
      <PressableScale onPress={onNext} style={styles.step} accessibilityLabel={`Next ${accessibilityLabel}`}>
        <Text style={styles.stepGlyph}>›</Text>
      </PressableScale>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  pitch: {
    ...type.fact,
    color: palette.textSecondary,
  },
  changeNote: {
    ...type.caption,
  },
  keptDate: {
    ...type.headline,
    fontSize: 28,
    lineHeight: 34,
    color: palette.accent,
  },
  pickers: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  register: {
    alignSelf: 'flex-start',
    minHeight: 34,
    justifyContent: 'center',
  },
  registerLabel: {
    color: palette.accent,
  },
  stepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
  },
  step: {
    width: 32,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: {
    color: palette.accent,
    fontSize: 20,
    lineHeight: 24,
  },
  stepValue: {
    ...type.label,
    color: palette.textPrimary,
    flexShrink: 1,
  },
  input: {
    ...type.fact,
    color: palette.textPrimary,
    backgroundColor: palette.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  error: {
    color: palette.incorrect,
  },
  free: {
    color: palette.correct,
  },
  claim: {
    alignSelf: 'flex-start',
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  claimLabel: {
    color: palette.void,
  },
  claimFull: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: palette.glassBorder,
  },
  claimFullLabel: {
    color: palette.textTertiary,
  },
});
