import { Platform } from 'react-native';

import { SubscriptionPackage } from '@/services/purchases/PurchaseService';

/**
 * Pro configuration — entitlement identifiers, RevenueCat keys, and the
 * paywall's marketing copy. Keys come from EXPO_PUBLIC_* env (inlined at
 * build time); absent keys make the app fall back to the dev provider, so the
 * whole Pro flow is exercisable before any billing account exists.
 */

/** Entitlement identifier configured in RevenueCat. */
export const PRO_ENTITLEMENT_ID = 'pro';
/** Offering identifier whose packages the paywall lists. */
export const PRO_OFFERING_ID = 'default';

export function revenueCatApiKey(): string {
  const key =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_RC_IOS_KEY
      : process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
  return key?.trim() ?? '';
}

export interface ProFeatureCopy {
  icon: string;
  title: string;
  description: string;
}

/**
 * The Pro pitch — the full "something for everyone" promise from the product
 * plan. The paywall renders these in order; the gating that backs each lands
 * across Waves 1-3.
 */
export const PRO_FEATURES: ProFeatureCopy[] = [
  {
    icon: '✦',
    title: 'Founder — a Seat and a Day',
    description:
      'Lifetime only: a numbered seat in the current generation, and one date of the year kept in your name at the foot of its register.',
  },
  {
    icon: '📚',
    title: 'The Whole Day, Not a Taste',
    description:
      // Twenty is the floor, not the average: the thinnest day in the archive
      // holds 21 and the median holds 22. Verified against the published
      // manifest — recheck it after any archive rebuild that changes depth.
      'At least twenty events are recorded for every calendar day. Free shows three; Pro opens all of them.',
  },
  {
    icon: '🔖',
    title: 'It Remembers What You’ve Read',
    description:
      'Come back next year and the feed opens on your first unread event — never the same story twice.',
  },
  {
    icon: '🕰️',
    title: 'Time Machine',
    description: 'Travel to any date in history — every day of the year, not just today.',
  },
  {
    icon: '⌖',
    title: 'Full Tactical Intel',
    description: 'Deep-dive assets, commanders, and strategic impact on every major event.',
  },
  {
    icon: '🧠',
    title: 'Recall Drills',
    description:
      'Events you answered come back on a schedule — days, then weeks, then months — so you actually remember them.',
  },
  {
    icon: '🦋',
    title: 'Unlimited Simulations',
    // "Track your accuracy by era" used to be here. Nothing tracks accuracy by
    // era — the debrief scores one round and forgets it. Removed rather than
    // left standing; see the note at the foot of this list.
    description:
      'Six thousand written scenarios across the archive, and Pro can replay any of them as often as it likes.',
  },
  {
    icon: '🔥',
    title: 'Streak Shields, Weekly',
    description:
      'Everyone gets one shield a month. Pro holds two, topped up every week — miss a day and nothing breaks.',
  },
  {
    icon: '🔎',
    title: 'Search the Whole Archive',
    description:
      'Every event on every day, searchable by name, year or era — and one tap lands you on the card.',
  },
  {
    icon: '🏛️',
    title: 'Complete the Museum',
    description:
      'Fourteen sets to collect — named battles, foundings, the space age. Reading is how you fill them.',
  },
  {
    icon: '🗳️',
    title: 'A Say in the Feed',
    description:
      'Vote for the event that should lead a day, and suggest one the archive is missing.',
  },
];

// NOTE: this list may only describe what the app actually does today.
// "Audio Briefings" and "Prestige Ranks & Themes" were removed because neither
// exists — narration is unbuilt, and Grandmaster is the top of the ladder with
// nothing beyond it. A paywall that bills for a feature the buyer cannot find
// is the fastest way to earn refunds and a store complaint. Add either back the
// day it ships, not the day it is planned.

/** Mock catalogue used by the dev provider (web + pre-billing development). */
export const DEV_PACKAGES: SubscriptionPackage[] = [
  {
    id: 'dev.annual',
    productId: 'history_unlocked_pro_annual',
    title: 'Annual',
    priceString: '$39.99 / yr',
    period: 'annual',
    // Recomputed with the prices, not left as marketing. Monthly runs to
    // $71.88 over a year, so $39.99 saves $31.89 — 44%. A savings figure that
    // no longer matches its own prices is a false claim, and it is the easiest
    // kind to leave behind after a change: recompute this whenever either
    // price moves.
    subtitle: 'Best value — save 44%',
    highlight: true,
  },
  {
    id: 'dev.monthly',
    productId: 'history_unlocked_pro_monthly',
    title: 'Monthly',
    priceString: '$5.99 / mo',
    period: 'monthly',
  },
  {
    id: 'dev.lifetime',
    productId: 'history_unlocked_pro_lifetime',
    title: 'Founder — Lifetime',
    // Matches FOUNDER_GENERATIONS[0]. See that file for why the first band is
    // priced below the market norm: an unlaunched archive cannot charge like a
    // proven one, and the early buyer is carrying that risk.
    priceString: '$79.99 once',
    period: 'lifetime',
    // Generation-neutral on purpose. The seats row above states which
    // generation is on sale, and it reads that from the live count; naming a
    // generation here too would mean two sources that can disagree — and in
    // production this string comes from the store, where the app cannot
    // correct it. NOTE for launch: each generation needs its OWN store
    // product, because the price differs per band.
    subtitle: 'A numbered seat and a day of the year, kept in your name',
  },
];
