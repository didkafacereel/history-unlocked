import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlbumPanel } from '@/components/album/AlbumPanel';
import { AccountPanel } from '@/components/auth/AccountPanel';
import { MuseumEntryPanel } from '@/components/collections/MuseumEntryPanel';
import { FounderBadge } from '@/components/founders/FounderBadge';
import { KeptDayPanel } from '@/components/founders/KeptDayPanel';
import { DailyReminderPanel } from '@/components/gamification/DailyReminderPanel';
import { ArchiveProgressPanel } from '@/components/gamification/ArchiveProgressPanel';
import { EraAccuracyPanel } from '@/components/gamification/EraAccuracyPanel';
import { IntelRankBadge } from '@/components/gamification/IntelRankBadge';
import { ProStatusPanel } from '@/components/gamification/ProStatusPanel';
import { RankProgressBar } from '@/components/gamification/RankProgressBar';
import { RecallDrillPanel } from '@/components/gamification/RecallDrillPanel';
import { StreakCalendarStrip } from '@/components/gamification/StreakCalendarStrip';
import { StreakFlame } from '@/components/gamification/StreakFlame';
import { StreakShieldRow } from '@/components/gamification/StreakShieldRow';
import { PressableScale } from '@/components/primitives/PressableScale';
import { SearchEntryPanel } from '@/components/search/SearchEntryPanel';
import { SegmentedText } from '@/components/primitives/SegmentedText';
import { goBack } from '@/lib/goBack';
import { palette, spacing } from '@/theme/tokens';

/** Intel Rank screen: long-term progression at a glance. */
export default function IntelRankScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <PressableScale
        onPress={() => goBack(router)}
        style={styles.back}
        accessibilityLabel="Back to the feed"
      >
        <Text style={styles.backGlyph}>‹</Text>
      </PressableScale>

      <View style={styles.rankSection}>
        <IntelRankBadge />
        <FounderBadge />
        <RankProgressBar />
      </View>

      <ArchiveProgressPanel />

      <AlbumPanel />

      <EraAccuracyPanel />

      <RecallDrillPanel />

      <MuseumEntryPanel />

      <SearchEntryPanel />

      <DailyReminderPanel />

      <KeptDayPanel />

      <View style={styles.streakSection}>
        <SegmentedText variant="label">Streak</SegmentedText>
        <StreakFlame />
        <StreakCalendarStrip />
        <StreakShieldRow />
      </View>

      <ProStatusPanel />

      <AccountPanel />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.ink,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing.xxl,
  },
  back: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.inkRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: {
    color: palette.textPrimary,
    fontSize: 24,
    lineHeight: 28,
  },
  rankSection: {
    alignItems: 'center',
    gap: spacing.xl,
  },
  streakSection: {
    gap: spacing.lg,
  },
});
