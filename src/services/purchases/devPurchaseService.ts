import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEV_PACKAGES } from '@/config/pro';

import { PurchaseOutcome, PurchaseService, SubscriptionPackage } from './PurchaseService';

/**
 * Provider-free Pro implementation. Persists a single boolean and simulates
 * purchase/restore so the entire Pro flow — paywall, gating, store — is
 * exercisable on web and in simulators with no billing account. The native
 * factory swaps this for RevenueCat once real keys are configured.
 */
const DEV_PRO_KEY = 'history-unlocked.dev.pro.v1';

export function createDevPurchaseService(): PurchaseService {
  let isPro = false;
  const listeners = new Set<(value: boolean) => void>();

  const emit = (value: boolean) => {
    isPro = value;
    for (const listener of listeners) {
      listener(value);
    }
  };

  return {
    isDev: true,

    async configure() {
      const stored = await AsyncStorage.getItem(DEV_PRO_KEY);
      isPro = stored === 'true';
    },

    async getOfferings(): Promise<SubscriptionPackage[]> {
      return DEV_PACKAGES;
    },

    async refreshEntitlement() {
      const stored = await AsyncStorage.getItem(DEV_PRO_KEY);
      isPro = stored === 'true';
      return isPro;
    },

    async purchase(): Promise<PurchaseOutcome> {
      await AsyncStorage.setItem(DEV_PRO_KEY, 'true');
      emit(true);
      return { isPro: true, cancelled: false };
    },

    async restore() {
      return this.refreshEntitlement();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    async devSetPro(value: boolean) {
      await AsyncStorage.setItem(DEV_PRO_KEY, String(value));
      emit(value);
    },
  };
}
