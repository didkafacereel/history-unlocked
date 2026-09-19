import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SegmentedText } from '@/components/primitives/SegmentedText';
import { palette, radius, spacing } from '@/theme/tokens';

/** One commander: portrait (or initials fallback), name, role. */
interface CommanderCardProps {
  name: string;
  role: string;
  portraitUrl?: string;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export const CommanderCard = memo(function CommanderCard({
  name,
  role,
  portraitUrl,
}: CommanderCardProps) {
  return (
    <View style={styles.row}>
      {portraitUrl ? (
        <Image source={{ uri: portraitUrl }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.initials}>{initialsOf(name)}</Text>
        </View>
      )}
      <View style={styles.textCol}>
        <SegmentedText variant="fact" style={styles.name}>
          {name}
        </SegmentedText>
        <SegmentedText variant="caption">{role}</SegmentedText>
      </View>
    </View>
  );
});

const AVATAR_SIZE = 40;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radius.pill,
  },
  avatarFallback: {
    backgroundColor: palette.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textCol: {
    flex: 1,
    gap: 1,
  },
  name: {
    color: palette.textPrimary,
  },
});
