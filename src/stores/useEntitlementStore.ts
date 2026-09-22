import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
 * (dev or RevenueCat) and caches `isPro` so cold start never flashes the free
 * UI before the provider answers.
 *
 * Same micro-matching rule as every store: subscribe to one field.
 *   const isPro = useIsPro();                 // gating
 *   const packages = useEntitlementStore(s => s.packages);  // paywall only
 */

interface EntitlementState {
  /** 'unknown' until the provider has been reconciled at least once. */
  status: 'unknown' | 'ready';
  isPro: boolean;
  packages: SubscriptionPackage[];
  purchasing: boolean;

  hydrate: () => Promise<void>;
  loadOfferings: () => Promise<void>;
  /** Resolves true when the user is Pro after the attempt (false if cancelled). */
  purchase: (packageId: string) => Promise<boolean>;
  restore: () => Promise<boolean>;
  /** __DEV__ only: flips the mock entitlement. No-op on RevenueCat. */
  devTogglePro: () => Promise<void>;
}

export const useEntitlementStore = create<EntitlementState>()(
  persist(
    (set, get) => ({
      status: 'unknown',
      isPro: false,
      packages: [],
      purchasing: false,

      hydrate: async () => {
        const service = getPurchaseService();
        await service.configure();
        // Live entitlement updates (renewals, cross-device restores).
        service.subscribe((isPro) => {
          set({ isPro });
          applyProSideEffects(isPro);
        });
        const isPro = await service.refreshEntitlement();
        set({ isPro, status: 'ready' });
        applyProSideEffects(isPro);
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
          set({ isPro: outcome.isPro });
          applyProSideEffects(outcome.isPro);

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
        const isPro = await getPurchaseService().restore();
        set({ isPro });
        applyProSideEffects(isPro);
        // A returning founder gets their seat and their day back from the
        // server; the device never held them in the first place.
        if (isPro) {
          await useFoundersStore.getState().refresh().catch(() => {});
        }
        return isPro;
      },

      devTogglePro: async () => {
        const service = getPurchaseService();
        if (service.devSetPro) {
          const next = !get().isPro;
          await service.devSetPro(next);
          set({ isPro: next });
          applyProSideEffects(next);
        }
      },
    }),
    {
      name: 'history-unlocked.entitlement.v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Cache only the verdict for instant cold-start UI; the provider remains
      // the source of truth and reconciles it on hydrate().
      partialize: (state) => ({ isPro: state.isPro }),
    },
  ),
);

/** Narrow selector for gating — the only thing most components need. */
export const useIsPro = () => useEntitlementStore((s) => s.isPro);
