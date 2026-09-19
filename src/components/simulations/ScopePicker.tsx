import { memo, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { loadAllEvents } from '@/data/ingestion';
import { ROUND_SIZE, scopeCounts, SimulationScope } from '@/data/simulationPlan';
import { formatCount } from '@/lib/formatCount';
import { palette, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { Era, EventCategory } from '@/types/manifest';

import { ScopeChip } from './ScopeChip';

/**
 * Pick what to be quizzed on.
 *
 * Eras first, then categories, because "I want to be tested on the Medieval
 * world" is the request people actually have; "test me on Sports & Games" is
 * the rarer, more deliberate one.
 *
 * The counts come from the live archive rather than a constant, so the picker
 * cannot promise a scope the manifest no longer fills.
 */
const ERAS: Era[] = ['Ancient', 'Classical', 'Medieval', 'Early Modern', 'Industrial', 'Modern'];

const CATEGORIES: EventCategory[] = [
  'Military & Conflict',
  'Politics & Power',
  'Science & Technology',
  'Exploration & Discovery',
  'Culture & Ideas',
  'Society & Rights',
  'Disaster & Tragedy',
  'Sports & Games',
  'Nations & Empires',
];

interface Counts {
  eras: Partial<Record<Era, number>>;
  categories: Partial<Record<EventCategory, number>>;
  total: number;
}

export const ScopePicker = memo(function ScopePicker({
  onPick,
}: {
  onPick: (scope: SimulationScope) => void;
}) {
  const [counts, setCounts] = useState<Counts | null>(null);

  useEffect(() => {
    let active = true;
    void loadAllEvents().then((all) => {
      if (active) {
        setCounts(scopeCounts(all));
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (!counts) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <SegmentedText variant="label" style={styles.kicker}>
          ✦ Simulations
        </SegmentedText>
        <Text style={styles.title}>Run the archive</Text>
        <SegmentedText variant="caption">
          {`Ten scenarios a round, drawn from the whole ${formatCount(counts.total)}-event archive. No XP, no streak — just the history.`}
        </SegmentedText>
      </View>

      <ScopeChip
        label="Everything"
        count={counts.total}
        minimum={ROUND_SIZE}
        onPress={() => onPick({ kind: 'all' })}
      />

      <View style={styles.group}>
        <SegmentedText variant="label">By era</SegmentedText>
        {ERAS.map((era) => (
          <ScopeChip
            key={era}
            label={era}
            count={counts.eras[era] ?? 0}
            minimum={ROUND_SIZE}
            onPress={() => onPick({ kind: 'era', era })}
          />
        ))}
      </View>

      <View style={styles.group}>
        <SegmentedText variant="label">By subject</SegmentedText>
        {CATEGORIES.map((category) => (
          <ScopeChip
            key={category}
            label={category}
            count={counts.categories[category] ?? 0}
            minimum={ROUND_SIZE}
            onPress={() => onPick({ kind: 'category', category })}
          />
        ))}
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.sm,
  },
  kicker: {
    color: palette.accent,
  },
  title: {
    ...type.headline,
  },
  group: {
    gap: spacing.sm,
  },
});
