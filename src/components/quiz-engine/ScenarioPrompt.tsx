import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlassPanel } from '@/components/primitives/GlassPanel';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { palette, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * Second-person scenario framing ("It is dawn on 11 June 1944. You command…")
 * followed by the decision prompt. The scenario is the immersion; the prompt
 * is the question.
 *
 * The kicker distinguishes the two kinds of question the engine can run. An
 * authored scenario asks the reader to judge; a generated one asks them to
 * remember. Labelling it is not a disclaimer — a recall drill is a different
 * promise, and a reader who is told which one they are in trusts both.
 */
interface ScenarioPromptProps {
  scenario: string;
  prompt: string;
  /** True for a question built from the manifest rather than authored. */
  generated?: boolean;
}

export const ScenarioPrompt = memo(function ScenarioPrompt({
  scenario,
  prompt,
  generated = false,
}: ScenarioPromptProps) {
  return (
    <View style={styles.block}>
      <SegmentedText variant="label" style={styles.kicker}>
        {generated ? 'Recall Check' : 'Simulation Brief'}
      </SegmentedText>
      <GlassPanel>
        <Text style={styles.scenario}>{scenario}</Text>
      </GlassPanel>
      <Text style={styles.prompt}>{prompt}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  block: {
    gap: spacing.md,
  },
  kicker: {
    color: palette.accent,
  },
  scenario: {
    ...type.fact,
    color: palette.textPrimary,
    fontStyle: 'italic',
  },
  prompt: {
    ...type.headline,
    fontSize: 21,
    lineHeight: 27,
  },
});
