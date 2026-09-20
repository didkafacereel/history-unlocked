import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeptDayPanel } from '@/components/founders/KeptDayPanel';
import { PressableScale } from '@/components/primitives/PressableScale';
import { goBack } from '@/lib/goBack';
import { palette, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';

/**
 * The claim form on its own, reached from a link about one date.
 *
 * `KeptDayPanel` already lives on the profile screen, ninth of eleven panels.
 * That is the right place to FIND it, and the wrong place to be SENT: a reader
 * who tapped "claim 20 September" and lands halfway down a progression screen
 * has to hunt for the thing they just asked for. Same component, no duplicated
 * logic — only a route that opens on it.
 *
 * `?date=MM-DD` opens the picker on that date.
 */
export default function KeepADayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { date } = useLocalSearchParams<{ date?: string }>();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <PressableScale onPress={() => goBack(router)} style={styles.back} accessibilityLabel="Back">
        <Text style={styles.backGlyph}>‹</Text>
      </PressableScale>

      <KeptDayPanel initialDateKey={date} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.void,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  backGlyph: {
    ...type.headline,
    color: palette.textSecondary,
    fontSize: 28,
    lineHeight: 30,
  },
});
