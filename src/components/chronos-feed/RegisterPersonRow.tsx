import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { usePersonDetailStore } from '@/stores/usePersonDetailStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { PersonEntry } from '@/types/manifest';

import { PersonPortrait } from './PersonPortrait';

/**
 * One name on the register: a face, the year, who they were — and a way in.
 *
 * It was a bare line of text and read like a phone book. The portrait is what
 * turns nine names into nine people, and the row opens a short biography for
 * anyone who wants more than a job title.
 */
export const RegisterPersonRow = memo(function RegisterPersonRow({
  person,
}: {
  person: PersonEntry;
}) {
  const open = usePersonDetailStore((s) => s.open);
  const year = person.year < 0 ? `${Math.abs(person.year)} BC` : String(person.year);

  return (
    <PressableScale
      onPress={() => open(person)}
      style={styles.row}
      accessibilityLabel={`${person.name}, ${person.description}`}
    >
      <PersonPortrait name={person.name} imageUrl={person.imageUrl} />
      <View style={styles.body}>
        <View style={styles.headline}>
          <Text style={styles.year}>{year}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {person.name}
          </Text>
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {person.description}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  body: {
    flex: 1,
    gap: 1,
  },
  headline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  year: {
    ...type.label,
    color: palette.accent,
    flexShrink: 0,
  },
  name: {
    ...type.fact,
    color: palette.textPrimary,
    fontWeight: '700',
    flexShrink: 1,
  },
  description: {
    ...type.caption,
    color: palette.textTertiary,
  },
  chevron: {
    color: palette.textTertiary,
    fontSize: 20,
    lineHeight: 22,
  },
});
