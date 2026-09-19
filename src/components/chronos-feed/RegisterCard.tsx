import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SuggestEventButton } from '@/components/feedback/SuggestEventButton';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { shortDateKeyLabel } from '@/lib/dateKey';
import { useFeedStore } from '@/stores/useFeedStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

import { KeptByLine } from './KeptByLine';
import { RegisterPersonRow } from './RegisterPersonRow';

/**
 * The day's register — who was born, who died, what the date is observed as.
 *
 * The "on this day" feed has carried ~220 births and ~110 deaths for every date
 * all along and the app used none of it. This is the other half of the format,
 * and the half people recognise: "Leonardo da Vinci, 1452" is a fact almost
 * anyone will read, and it costs nothing but the choosing.
 *
 * Deliberately a LIST, not more full-screen cards. A whole card saying one
 * person was born would be thin; twelve names on one surface is dense in the
 * way the rest of the feed is dense.
 */
export const RegisterCard = memo(function RegisterCard() {
  const register = useFeedStore((s) => s.register);
  const dateKey = useFeedStore((s) => s.dateKey);
  const insets = useSafeAreaInsets();

  if (!register) {
    return null;
  }

  const { births, deaths, observances } = register;

  return (
    <View style={styles.card}>
      <LinearGradient colors={[palette.void, palette.ink, '#12131C']} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xxxl, paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SegmentedText variant="label" style={styles.kicker}>
          {dateKey ? `The register · ${shortDateKeyLabel(dateKey)}` : 'The register'}
        </SegmentedText>

        {births.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Born on this day</Text>
            <View style={styles.list}>
              {births.map((person) => (
                <RegisterPersonRow key={`b-${person.wikiTitle}`} person={person} />
              ))}
            </View>
          </View>
        ) : null}

        {deaths.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Died on this day</Text>
            <View style={styles.list}>
              {deaths.map((person) => (
                <RegisterPersonRow key={`d-${person.wikiTitle}`} person={person} />
              ))}
            </View>
          </View>
        ) : null}

        {observances.length > 0 ? (
          <View style={styles.observances}>
            <SegmentedText variant="label">Also observed as</SegmentedText>
            {observances.map((text) => (
              <Text key={text} style={styles.observance} numberOfLines={2}>
                {text}
              </Text>
            ))}
          </View>
        ) : null}

        <KeptByLine />

        <SegmentedText variant="caption" style={styles.portraitNote}>
          Portraits from Wikimedia Commons — tap a name for its credit.
        </SegmentedText>

        {/* The close of the day is where "hang on, where is X?" occurs. */}
        <SuggestEventButton />
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  kicker: {
    color: palette.accent,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...type.headline,
    fontSize: 22,
    lineHeight: 27,
  },
  list: {
    gap: spacing.sm,
  },
  observances: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: palette.inkRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.glassBorder,
  },
  observance: {
    ...type.fact,
    color: palette.textSecondary,
  },
  // Nine portraits cannot each carry a credit line without burying the names,
  // so the card points at where each one is stated in full.
  portraitNote: {
    marginTop: -spacing.sm,
  },
});
