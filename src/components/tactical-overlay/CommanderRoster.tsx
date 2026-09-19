import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { palette, spacing } from '@/theme/tokens';
import { CommanderProfile } from '@/types/manifest';

import { CommanderCard } from './CommanderCard';

/** "Key Commanders" section, grouped by faction in manifest order. */
interface CommanderRosterProps {
  commanders: CommanderProfile[];
}

export const CommanderRoster = memo(function CommanderRoster({
  commanders,
}: CommanderRosterProps) {
  const factions = useMemo(() => {
    const groups = new Map<string, CommanderProfile[]>();
    for (const commander of commanders) {
      const group = groups.get(commander.faction);
      if (group) {
        group.push(commander);
      } else {
        groups.set(commander.faction, [commander]);
      }
    }
    return Array.from(groups, ([faction, members]) => ({ faction, members }));
  }, [commanders]);

  return (
    <View style={styles.section}>
      <SegmentedText variant="label">Key Commanders</SegmentedText>
      {factions.map(({ faction, members }) => (
        <View key={faction} style={styles.factionBlock}>
          <SegmentedText variant="caption" style={styles.factionName}>
            {faction}
          </SegmentedText>
          <View style={styles.members}>
            {members.map((commander) => (
              <CommanderCard
                key={commander.id}
                name={commander.name}
                role={commander.role}
                portraitUrl={commander.portraitUrl}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  factionBlock: {
    gap: spacing.sm,
  },
  factionName: {
    color: palette.accent,
  },
  members: {
    gap: spacing.md,
  },
});
