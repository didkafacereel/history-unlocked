import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';

/**
 * The app's haptic vocabulary. Components call semantic verbs, never the
 * Haptics API directly, so the physical language stays consistent.
 */
export function useHaptics() {
  return useMemo(
    () => ({
      /** A card snapping into place after a swipe. */
      cardSettle: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },
      /** Hitting the rubber-band at either end of the deck. */
      deckEdge: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
      },
      /** Tactical overlay snapping open or dismissing. */
      sheetSnap: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
      /** Reserved for the quiz engine. */
      correct: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      },
      incorrect: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      },
    }),
    [],
  );
}
