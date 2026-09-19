import { create } from 'zustand';

import { DeckPlan, planDeck } from '@/data/deckPlan';
import { loadDailyDeck } from '@/data/ingestion';
import { prefetchAround } from '@/data/prefetch';
import { DayRegister, EventCategory, HistoricalEvent } from '@/types/manifest';

import { useEntitlementStore } from './useEntitlementStore';
import { useLibraryStore, whenLibraryReady } from './useLibraryStore';

/**
 * Feed state. CONTRACT: nothing in this store is touched during a gesture —
 * the swipe lives entirely on the UI thread as shared values. The store is
 * updated exactly once per card change, after the settle spring completes.
 *
 * Subscribe with the narrowest selector possible, e.g.
 *   const activeIndex = useFeedStore((s) => s.activeIndex);
 * Never `useFeedStore()` bare — that subscribes to everything.
 */

type FeedStatus = 'idle' | 'ready' | 'error';

const EMPTY_UNSEEN: ReadonlySet<string> = new Set();

interface FeedState {
  status: FeedStatus;
  dateKey: string | null;
  deck: HistoricalEvent[];
  activeIndex: number;
  /** Events on this date withheld behind Pro (see `planDeck`). */
  lockedCount: number;
  /** Ids in `deck` the reader has never opened — drives the NEW badge. */
  unseenIds: ReadonlySet<string>;
  /** The day's lead, pinned at index 0. Drives the hero treatment. */
  heroId: string | null;
  /** Who was born and died on this date. Absent for uncovered dates. */
  register: DayRegister | null;
  /**
   * The day exactly as ingestion returned it, before the plan narrowed it.
   * Kept so a filter change can re-plan locally instead of refetching — the
   * manifest is one document and this IS the whole day.
   */
  dayEvents: HistoricalEvent[];
  /** Active category narrowing, or null for the whole day. Pro only. */
  category: EventCategory | null;
  /** How many events the whole day holds per category — drives the filter UI. */
  categoryCounts: Partial<Record<EventCategory, number>>;
  /**
   * Bumped on every load. The feed is keyed on it so a new day gets a fresh
   * gesture surface — `scrollY` is a shared value with no reset path, and
   * remounting is cheaper to reason about than reaching into the UI thread.
   */
  deckToken: number;
  /** Entitlement the current deck was planned against — see `loadDeck`. */
  plannedPro: boolean;
  /** True once the user has swiped at least once (dismisses SwipeHintPulse). */
  hasSwiped: boolean;
  error: string | null;

  /** Load a day's deck. An uncovered date yields an empty deck, never a guess. */
  loadDeck: (dateKey: string) => Promise<void>;
  /** Narrow the current day to one category, or clear with null. */
  setCategory: (category: EventCategory | null) => void;
  settleOnIndex: (index: number) => void;
}

export const useFeedStore = create<FeedState>()((set, get) => ({
  status: 'idle',
  dateKey: null,
  deck: [],
  activeIndex: 0,
  lockedCount: 0,
  unseenIds: EMPTY_UNSEEN,
  heroId: null,
  register: null,
  dayEvents: [],
  category: null,
  categoryCounts: {},
  deckToken: 0,
  plannedPro: false,
  hasSwiped: false,
  error: null,

  loadDeck: async (dateKey) => {
    const isPro = useEntitlementStore.getState().isPro;
    const current = get();
    // A filter belongs to the day it was set on: carrying "Science" onto a date
    // with no science would silently show an unfiltered day under a lit chip.
    const category = current.dateKey === dateKey ? current.category : null;
    // Re-planning a day the reader is already on would advance them past the
    // card in front of them — the landing card is marked read below, so a
    // second plan of the same day resumes one event further on. Only an
    // actual change of day or entitlement earns a new deck.
    if (current.status === 'ready' && current.dateKey === dateKey && current.plannedPro === isPro) {
      return;
    }

    try {
      const [{ events, register }] = await Promise.all([
        loadDailyDeck(dateKey),
        whenLibraryReady(),
      ]);
      const plan: DeckPlan = planDeck(events, {
        isPro,
        seen: useLibraryStore.getState().seen,
        category,
      });

      set({
        status: 'ready',
        dateKey,
        deck: plan.events,
        activeIndex: plan.startIndex,
        lockedCount: plan.lockedCount,
        unseenIds: plan.unseenIds,
        heroId: plan.heroId,
        categoryCounts: plan.categoryCounts,
        dayEvents: events,
        category,
        register: register ?? null,
        deckToken: current.deckToken + 1,
        plannedPro: isPro,
        error: null,
      });

      // The landing card is on screen, so it counts as read. Marking it here
      // (rather than on settle) means a one-card day is still remembered.
      const landing = plan.events[plan.startIndex];
      if (landing) {
        useLibraryStore.getState().markSeen(landing.id);
      }
      prefetchAround(plan.events, plan.startIndex);
    } catch (e) {
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  },

  setCategory: (category) => {
    const { dateKey, dayEvents, category: current } = get();
    if (category === current || dateKey === null || dayEvents.length === 0) {
      return;
    }
    // Re-plan the day already in hand rather than refetching it: the manifest
    // is one document and the deck we hold is the whole day, so narrowing is
    // pure local work. A new token remounts the feed at the top of the result.
    const plan = planDeck(dayEvents, {
      isPro: useEntitlementStore.getState().isPro,
      seen: useLibraryStore.getState().seen,
      category,
    });
    set({
      category,
      deck: plan.events,
      activeIndex: plan.startIndex,
      lockedCount: plan.lockedCount,
      unseenIds: plan.unseenIds,
      heroId: plan.heroId,
      categoryCounts: plan.categoryCounts,
      deckToken: get().deckToken + 1,
    });
  },

  settleOnIndex: (index) => {
    const { deck, activeIndex } = get();
    // Indices past the deck are legal: the depth-lock and quiz gate cards live
    // out there. prefetchAround is a no-op beyond the deck.
    if (index === activeIndex || index < 0 || index > deck.length + 1) {
      return;
    }
    set({ activeIndex: index, hasSwiped: true });

    const event = deck[index];
    if (event) {
      // One write per settle, outside the gesture. `unseenIds` is deliberately
      // NOT updated: the NEW badge should stay on the card you are reading.
      useLibraryStore.getState().markSeen(event.id);
    }
    prefetchAround(deck, index);
  },
}));
