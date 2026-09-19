import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { generationForSeat, getFoundersService } from '@/services/founders';
import { useFounderSeat } from '@/stores/useFoundersStore';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * "Founder I · #47" — the seat, worn.
 *
 * A number rather than a word, because a number is the thing that cannot be
 * given to everyone later. "Pro member" is a state; "#47" is a position in a
 * line that closed. The generation numeral says WHICH line: once the first five
 * hundred are gone nobody joins them, and a later buyer can see exactly where
 * they stand without anyone having to phrase it unkindly.
 *
 * While the local stand-in is running it says so. A seat that has not actually
 * been allocated anywhere must never be shown as if it had — that is a lie the
 * only person who can catch it is the one who paid for it.
 */
export const FounderBadge = memo(function FounderBadge({ compact = false }: { compact?: boolean }) {
  const seat = useFounderSeat();

  if (seat === null) {
    return null;
  }

  const generation = generationForSeat(seat);

  return (
    <View style={styles.wrap}>
      <View style={compact ? { ...styles.badge, ...styles.badgeCompact } : styles.badge}>
        <Text style={styles.crest}>✦</Text>
        <SegmentedText variant="label" style={styles.label}>
          {generation ? `Founder ${generation.numeral} · #${seat}` : `Founder #${seat}`}
        </SegmentedText>
      </View>
      {generation && !compact ? (
        <SegmentedText variant="caption" style={styles.generation}>
          {generation.name}
        </SegmentedText>
      ) : null}
      {getFoundersService().isLocal && !compact ? (
        <SegmentedText variant="caption" style={styles.provisional}>
          Provisional — seats are assigned for real once founders go live.
        </SegmentedText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  badgeCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  crest: {
    color: palette.void,
    fontSize: 13,
    lineHeight: 16,
  },
  label: {
    color: palette.void,
  },
  generation: {
    color: palette.accent,
  },
  provisional: {
    color: palette.textTertiary,
  },
});
