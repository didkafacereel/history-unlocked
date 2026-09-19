import { createDevPurchaseService } from './devPurchaseService';
import { PurchaseService } from './PurchaseService';
import { createRevenueCatService, hasRevenueCatKeys } from './revenueCat.native';

/**
 * Native resolution: RevenueCat when an API key is configured, otherwise the
 * dev provider — so a native build without billing keys still runs the full
 * Pro flow against the mock.
 */
let instance: PurchaseService | null = null;

export function getPurchaseService(): PurchaseService {
  if (!instance) {
    instance = hasRevenueCatKeys() ? createRevenueCatService() : createDevPurchaseService();
  }
  return instance;
}

export * from './PurchaseService';
