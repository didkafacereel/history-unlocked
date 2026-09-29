import { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';

import { PressableScale } from '@/components/primitives/PressableScale';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { formatFilmLength } from '@/data/films';
import { useDayFilm, useFilmStore } from '@/stores/useFilmStore';
import { palette, radius, spacing } from '@/theme/tokens';

/**
 * "▶ The day's film · 0:52" — beside the lead badge, on the lead card only.
 *
 * The lead is the top of the date, which is where the film belongs: the one
 * piece of the day made to be watched rather than read. Free for everyone; it
 * is the daily reason to open the app, not a paid extra.
 *
 * Renders nothing until the index says this date has a film, so a date without
 * one — or an app with no films host configured — looks exactly as before.
 */
export const CardFilmButton = memo(function CardFilmButton({ dateKey }: { dateKey: string }) {
  const film = useDayFilm(dateKey);
  const play = useFilmStore((s) => s.play);

  useEffect(() => {
    void useFilmStore.getState().ensureLoaded();
  }, []);

  if (!film) {
    return null;
  }

  return (
    <PressableScale
      onPress={() => play(film)}
      style={styles.pill}
      accessibilityLabel={`Watch the day's film, ${formatFilmLength(film.seconds)}`}
    >
      <SegmentedText variant="label" style={styles.label}>
        {`▶ The day’s film · ${formatFilmLength(film.seconds)}`}
      </SegmentedText>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  // Solid, unlike the outlined lead badge beside it: this one is an action.
  pill: {
    backgroundColor: palette.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  label: {
    color: palette.void,
  },
});
