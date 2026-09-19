import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShareEventButton } from '@/components/share/ShareEventButton';
import { TacticalTrigger } from '@/components/tactical-overlay/TacticalTrigger';
import { useFeedStore } from '@/stores/useFeedStore';
import { spacing } from '@/theme/tokens';
import { HistoricalEvent } from '@/types/manifest';

import { CardBackdrop } from './CardBackdrop';
import { CardEraBadge } from './CardEraBadge';
import { CardFactStack } from './CardFactStack';
import { CardHeadline } from './CardHeadline';
import { CardImageCredit } from './CardImageCredit';
import { CardKeepButton } from './CardKeepButton';
import { CardLeadBadge } from './CardLeadBadge';
import { CardNewBadge } from './CardNewBadge';
import { CardReadersChoiceBadge } from './CardReadersChoiceBadge';

/**
 * One full-screen historical event. Pure composition — no gesture logic, no
 * store subscriptions, no animation. Memoized on a stable `event` reference,
 * so it never re-renders during swiping; only the window shift remounts it.
 */
interface HistoryCardViewerProps {
  event: HistoricalEvent;
}

export const HistoryCardViewer = memo(function HistoryCardViewer({
  event,
}: HistoryCardViewerProps) {
  const insets = useSafeAreaInsets();
  // A boolean, not the set: this re-renders only if THIS card's read-state
  // flips, which it never does mid-session (the badge stays on the card you
  // are reading). Marking-as-read happens in the feed store, on settle.
  const isUnseen = useFeedStore((s) => s.unseenIds.has(event.id));
  // Booleans again, for the same reason: neither flips while the card is
  // mounted, so this card never re-renders because another one changed.
  const isLead = useFeedStore((s) => s.heroId === event.id);

  return (
    <View style={styles.card}>
      <CardBackdrop imageUrl={event.imageUrl} aspect={event.imageAspect} />
      <View
        style={[
          styles.content,
          {
            // The content is bottom-anchored, so a long card grows UPWARD —
            // and with nothing stopping it, the lead badge and the era chip
            // ended up underneath the streak and date chips. This reserves the
            // top bar's own band: its inset, its offset, and a chip's height.
            paddingTop: insets.top + TOP_BAR_BAND,
            // Keep clear of the home indicator plus room for the swipe hint.
            paddingBottom: insets.bottom + spacing.xxxl,
          },
        ]}
      >
        {isLead ? (
          <View style={styles.leadRow}>
            <CardLeadBadge dateKey={event.dateKey} />
          </View>
        ) : null}
        <View style={styles.meta}>
          {event.readersChoice ? <CardReadersChoiceBadge share={event.voteShare} /> : null}
          {isUnseen && <CardNewBadge />}
          <CardEraBadge year={event.year} era={event.era} region={event.region} />
        </View>
        <CardHeadline year={event.year} title={event.title} hero={isLead} />
        <CardFactStack event={event} />
        <View style={styles.actions}>
          {event.tactical && (
            <TacticalTrigger eventTitle={event.title} tactical={event.tactical} />
          )}
          <CardKeepButton eventId={event.id} title={event.title} />
          <ShareEventButton event={event} />
        </View>
        {event.imageCredit || event.textCredit ? (
          <CardImageCredit
            credit={[event.imageCredit, event.textCredit].filter(Boolean).join('   ·   ')}
          />
        ) : null}
      </View>
    </View>
  );
});

/** FeedTopBar's offset from the inset, plus the height of a chip, plus a gap. */
const TOP_BAR_BAND = spacing.md + 38 + spacing.md;

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  // Sits on its own line above the meta row: the lead badge is a statement
  // about the whole card, not another attribute of the event.
  leadRow: {
    flexDirection: 'row',
    marginBottom: -spacing.sm,
  },
  // The NEW pill and the era chip share a row; the era chip ellipsizes so a
  // long region can never push the pill off the card.
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
