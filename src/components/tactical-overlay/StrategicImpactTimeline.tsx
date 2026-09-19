import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { palette, radius, spacing } from '@/theme/tokens';
import { StrategicImpact } from '@/types/manifest';

/** "Strategic Impact" — consequences as a stepped vertical timeline. */
interface StrategicImpactTimelineProps {
  impacts: StrategicImpact[];
}

export const StrategicImpactTimeline = memo(function StrategicImpactTimeline({
  impacts,
}: StrategicImpactTimelineProps) {
  return (
    <View style={styles.section}>
      <SegmentedText variant="label">Strategic Impact</SegmentedText>
      <View>
        {impacts.map((impact, i) => (
          <View key={impact.id} style={styles.step}>
            <View style={styles.spine}>
              <View style={styles.node} />
              {i < impacts.length - 1 && <View style={styles.connector} />}
            </View>
            <View style={styles.body}>
              <SegmentedText variant="label" style={styles.horizon}>
                {impact.horizon}
              </SegmentedText>
              <SegmentedText variant="fact" style={styles.consequence}>
                {impact.consequence}
              </SegmentedText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

const NODE_SIZE = 10;

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  spine: {
    alignItems: 'center',
    width: NODE_SIZE,
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
    marginTop: 3,
  },
  connector: {
    flex: 1,
    width: 2,
    backgroundColor: palette.accentDim,
    marginVertical: spacing.xs / 2,
  },
  body: {
    flex: 1,
    gap: spacing.xs / 2,
    paddingBottom: spacing.lg,
  },
  horizon: {
    color: palette.accent,
  },
  consequence: {
    color: palette.textPrimary,
  },
});
