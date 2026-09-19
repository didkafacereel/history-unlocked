import { memo, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { getFoundersService } from '@/services/founders';
import { useFeedStore } from '@/stores/useFeedStore';
import { palette, spacing } from '@/theme/tokens';

/**
 * "This day is kept by …" — the founder's name at the foot of the register.
 *
 * The whole point of the privilege is that it is visible to everyone, not a
 * badge only its owner sees. It is also deliberately quiet: a small line under
 * the day's dead, in the archive's own voice, not a sponsor slot.
 *
 * Absent when nobody keeps the day, which is most days for a long time — an
 * empty "be the first!" prompt here would turn the register into an advert.
 */
export const KeptByLine = memo(function KeptByLine() {
  const dateKey = useFeedStore((s) => s.dateKey);
  const [keepers, setKeepers] = useState<string[]>([]);

  useEffect(() => {
    if (!dateKey) {
      return;
    }
    let active = true;
    void getFoundersService()
      .keepersFor(dateKey)
      .then((names) => {
        if (active) {
          setKeepers(names);
        }
      });
    return () => {
      active = false;
    };
  }, [dateKey]);

  if (keepers.length === 0) {
    return null;
  }

  return (
    <View style={styles.line}>
      <SegmentedText variant="label" style={styles.label}>
        {keepers.length === 1 ? 'This day is kept by' : 'This day is kept by'}
      </SegmentedText>
      <SegmentedText variant="fact" style={styles.names}>
        {keepers.join(' · ')}
      </SegmentedText>
    </View>
  );
});

const styles = StyleSheet.create({
  line: {
    gap: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.glassBorder,
  },
  label: {
    color: palette.textTertiary,
  },
  names: {
    color: palette.accent,
  },
});
