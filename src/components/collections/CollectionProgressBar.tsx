import { memo } from 'react';
import { DimensionValue, StyleSheet, View } from 'react-native';

import { palette, radius } from '@/theme/tokens';

/**
 * How much of a set is collected. A completed bar switches to the "correct"
 * green rather than the accent amber, so a finished collection reads as
 * finished from across the screen without needing a label — except on a solemn
 * set, where "well done" is the wrong thing to say.
 */
interface CollectionProgressBarProps {
  read: number;
  total: number;
  /** A solemn set shows progress but never a triumphant completion colour. */
  solemn?: boolean;
}

export const CollectionProgressBar = memo(function CollectionProgressBar({
  read,
  total,
  solemn = false,
}: CollectionProgressBarProps) {
  const ratio = total > 0 ? Math.min(read / total, 1) : 0;
  const complete = total > 0 && read >= total && !solemn;
  // A single card out of hundreds would otherwise render as no bar at all,
  // which reads as "you have not started" when the reader has.
  const width: DimensionValue = ratio > 0 ? `${Math.max(ratio * 100, 3)}%` : 0;

  return (
    <View style={styles.track}>
      <View
        style={[styles.fill, complete ? styles.fillComplete : styles.fillPartial, { width }]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  track: {
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: palette.glass,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  fillPartial: {
    backgroundColor: palette.accent,
  },
  fillComplete: {
    backgroundColor: palette.correct,
  },
});
