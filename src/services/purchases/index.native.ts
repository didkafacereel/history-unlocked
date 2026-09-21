import { createDevPurchaseService } from './devPurchaseService';
import { PurchaseService } from './PurchaseService';
import { createRevenueCatService, hasRevenueCatKeys } from './revenueCat.native';
import { createUnavailablePurchaseService } from './unavailablePurchaseService';

/**
 * Native resolution: RevenueCat when an API key is configured. Without one, a
 * DEBUG build gets the mock so the whole Pro flow stays exercisable, and a
 * RELEASE build gets nothing at all.
 *
 * That split is the point. The mock's `purchase()` writes true and returns
 * success without taking a payment, and until now a release build with a
 * missing environment variable fell straight into it — showing real prices and
 * granting Pro to everyone who tapped the button. One absent variable was the
 * difference between a paid tier and a free-for-all, and nothing said so.
 *
 * `__DEV__` rather than a key check, because the hazard is specifically about
 * what ships. A build that can reach a store is a build that must not fake one.
 */
let instance: PurchaseService | null = null;

export function getPurchaseService(): PurchaseService {
  if (!instance) {
    instance = hasRevenueCatKeys()
      ? createRevenueCatService()
      : __DEV__
        ? createDevPurchaseService()
        : createUnavailablePurchaseService();
  }
  return instance;
}

export * from './PurchaseService';
