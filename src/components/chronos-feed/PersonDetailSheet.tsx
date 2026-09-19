import * as WebBrowser from 'expo-web-browser';
import { memo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/primitives/BottomSheet';
import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { usePersonDetailStore } from '@/stores/usePersonDetailStore';
import { palette, radius, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

import { PersonPortrait } from './PersonPortrait';

/**
 * Who a name on the register actually was.
 *
 * The register card holds nine people and can only give each of them a line;
 * this is where the line becomes a paragraph. Deliberately short — a few
 * sentences and a way through to Wikipedia, not a biography the app pretends
 * to have written.
 *
 * Renders beside the feed deck, never inside it. See `usePersonDetailStore`.
 */
export const PersonDetailSheet = memo(function PersonDetailSheet() {
  const person = usePersonDetailStore((s) => s.person);
  const close = usePersonDetailStore((s) => s.close);

  if (!person) {
    return null;
  }

  const year = person.year < 0 ? `${Math.abs(person.year)} BC` : String(person.year);
  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
    person.wikiTitle.replace(/ /g, '_'),
  )}`;

  return (
    <BottomSheet
      onClose={close}
      heightRatio={0.72}
      accessibilityLabel={`Close ${person.name}`}
      header={
        <View style={styles.header}>
          <PersonPortrait name={person.name} imageUrl={person.imageUrl} size={64} />
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={2}>
              {person.name}
            </Text>
            <SegmentedText variant="label" style={styles.year}>
              {year}
            </SegmentedText>
          </View>
        </View>
      }
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>{person.description}</Text>

        {person.summary ? <Text style={styles.summary}>{person.summary}</Text> : null}

        <PressableScale
          onPress={() => {
            void WebBrowser.openBrowserAsync(wikiUrl);
          }}
          style={styles.link}
          accessibilityLabel={`Read the full article about ${person.name} on Wikipedia`}
        >
          <SegmentedText variant="label" style={styles.linkLabel}>
            Read on Wikipedia ↗
          </SegmentedText>
        </PressableScale>

        {/* The terms the portrait and the text are used under. Not decoration. */}
        <View style={styles.credits}>
          {person.imageCredit ? (
            <SegmentedText variant="caption">{`Portrait: ${person.imageCredit}`}</SegmentedText>
          ) : null}
          {person.summary ? (
            <SegmentedText variant="caption">Text: Wikipedia · CC BY-SA 4.0</SegmentedText>
          ) : null}
        </View>
      </ScrollView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    ...type.headline,
    fontSize: 22,
    lineHeight: 27,
  },
  year: {
    color: palette.accent,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  description: {
    ...type.fact,
    color: palette.textSecondary,
    fontStyle: 'italic',
  },
  summary: {
    ...type.fact,
    color: palette.textPrimary,
    lineHeight: 24,
  },
  link: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: palette.accent,
    backgroundColor: palette.accentDim,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  linkLabel: {
    color: palette.accent,
  },
  credits: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});
