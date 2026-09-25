import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { hasProAccess } from '@/lib/proAccess';
import { getPurchaseService, SubscriptionPackage } from '@/services/purchases';
import { lifetimeIsSellable } from '@/services/founders';
import { useFoundersStore } from '@/stores/useFoundersStore';
import { useProgressionStore } from '@/stores/useProgressionStore';

/** Apply a Pro verdict and top up the Pro-only streak shields in one place. */
function applyProSideEffects(isPro: boolean): void {
  useProgressionStore.getState().refreshProFreezes(isPro);
}

/**
 * The single source of truth for Pro access. Orchestrates the PurchaseService
 * (dev or RevenueCat) and caches the verdict so cold start never flashes the
 * free UI before the provider answers.
 *
 * TWO ROUTES TO PRO, ONE ANSWER. `purchased` is what the store says was bought;
 * `trialEndsAt` is the launch gift's week, granted by our server. `isPro` is
 * the combination, computed in one place (`hasProAccess`), and it is the only
 * field gating code reads — so every locked feature opens for a gift week
 * exactly as it does for a subscriber, with nothing to change at each lock.
 *
 * Code that must know which it is — the paywall, choosing what to sell — reads
 * `purchased`: a reader in their free week is a reader to sell a plan to, not
 * someone to offer only Lifetime.
 *
 * Same micro-matching rule as every store: subscribe to one field.
 *   const isPro = useIsPro();                 // gating
 *   const packages = useEntitlementStore(s => s.packages);  // paywall only
 */

interface EntitlementState {
  /** 'unknown' until the provider has been reconciled at least once. */
  status: 'unknown' | 'ready';
  /** Effective access: purchased, or inside the gift week. */
  isPro: boolean;
  /** Bought through the store (or the dev toggle). */
  purchased: boolean;
  /** End of the gift week, epoch ms by the server's clock; null if none. */
  trialEndsAt: number | null;
  /** Server clock minus phone clock, from the last server answer. */
  clockOffset: number;
  packages: SubscriptionPackage[];
  purchasing: boolean;

  hydrate: () => Promise<void>;
  loadOfferings: () => Promise<void>;
  /** Resolves true when the user is Pro after the attempt (false if cancelled). */
  purchase: (packageId: string) => Promise<boolean>;
  restore: () => Promise<boolean>;
  /** Record the gift week the server granted. */
  setTrial: (endsAt: number | null, clockOffset: number) => void;
  /** Re-evaluate access — a gift week can end while the app sits in the background. */
  recompute: () => void;
  /** __DEV__ only: flips the mock entitlement. No-op on RevenueCat. */
  devTogglePro: () => Promise<void>;
}

export const useEntitlementStore = create<EntitlementState>()(
  persist(
    (set, get) => {
      /** Set the store verdict and re-derive access from both routes. */
      const settle = (patch: Partial<Pick<EntitlementState, 'purchased' | 'trialEndsAt' | 'clockOffset'>>) => {
        const next = { ...get(), ...patch };
        const isPro = hasProAccess({
          purchased: next.purchased,
          trialEndsAt: next.trialEndsAt,
          now: Date.now(),
          clockOffset: next.clockOffset,
        });
        const changed = isPro !== get().isPro;
        set({ ...patch, isPro });
        if (changed) {
          applyProSideEffects(isPro);
        }
      };

      return {
        status: 'unknown',
        isPro: false,
        purchased: false,
        trialEndsAt: null,
        clockOffset: 0,
        packages: [],
        purchasing: false,

        hydrate: async () => {
          const service = getPurchaseService();
          await service.configure();
          // Live entitlement updates (renewals, cross-device restores).
          service.subscribe((purchased) => settle({ purchased }));
          const purchased = await service.refreshEntitlement();
          set({ status: 'ready' });
          settle({ purchased });
          applyProSideEffects(get().isPro);
          void get().loadOfferings();
        },

        loadOfferings: async () => {
          try {
            const offered = await getPurchaseService().getOfferings();
            // Filtered HERE rather than in the paywall, so no screen can show a
            // product this build cannot honour by reading `packages` directly.
            // See `lifetimeIsSellable` for what it is protecting against.
            set({
              packages: lifetimeIsSellable()
                ? offered
                : offered.filter((p) => p.period !== 'lifetime'),
            });
          } catch {
            // Offerings are best-effort; the paywall shows a retry affordance.
          }
        },

        purchase: async (packageId) => {
          set({ purchasing: true });
          try {
            const outcome = await getPurchaseService().purchase(packageId);
            settle({ purchased: outcome.isPro });

            // A lifetime purchase is also a founder seat. Claiming is idempotent
            // and best-effort: a seat that cannot be allocated right now is
            // recoverable on the next launch, and must not fail the purchase the
            // reader has already paid for.
            const bought = get().packages.find((p) => p.id === packageId);
            if (outcome.isPro && !outcome.cancelled && bought?.period === 'lifetime') {
              await useFoundersStore.getState().claimSeat().catch(() => {});
            }
            return outcome.isPro && !outcome.cancelled;
          } finally {
            set({ purchasing: false });
          }
        },

        restore: async () => {
          const purchased = await getPurchaseService().restore();
          settle({ purchased });
          // A returning founder gets their seat and their day back from the
          // server; the device never held them in the first place.
          if (purchased) {
            await useFoundersStore.getState().refresh().catch(() => {});
          }
          return purchased;
        },

        setTrial: (trialEndsAt, clockOffset) => settle({ trialEndsAt, clockOffset }),

        recompute: () => settle({}),

        devTogglePro: async () => {
          const service = getPurchaseService();
          if (service.devSetPro) {
            const next = !get().purchased;
            await service.devSetPro(next);
            settle({ purchased: next });
          }
        },
      };
    },
    {
      name: 'history-unlocked.entitlement.v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Cache the verdict for instant cold-start UI, plus the gift week so an
      // offline launch still honours it; the provider and the server remain the
      // source of truth and reconcile on hydrate.
      partialize: (state) => ({
        isPro: state.isPro,
        purchased: state.purchased,
        trialEndsAt: state.trialEndsAt,
        clockOffset: state.clockOffset,
      }),
    },
  ),
);

/** Narrow selector for gating — the only thing most components need. */
export const useIsPro = () => useEntitlementStore((s) => s.isPro);
