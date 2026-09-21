import { PurchaseOutcome, PurchaseService, SubscriptionPackage } from './PurchaseService';

/**
 * Billing that is honestly switched off.
 *
 * Used in a RELEASE build with no RevenueCat key. The alternative — and what
 * this replaced — was falling through to the dev provider, whose `purchase()`
 * writes `true` to AsyncStorage and returns success without taking a payment.
 * A production build missing one environment variable would therefore have
 * shown real prices and handed Pro to everybody who tapped the button, with
 * nothing anywhere to say so.
 *
 * Silent wrong is worse than loud absent. This grants nothing, offers nothing,
 * and leaves the free app entirely intact: no packages means the paywall shows
 * its spinner and its feature list but cannot sell, which is the truthful state
 * of a build that has no billing configured.
 *
 * `isDev: false` deliberately. It is not the mock, and nothing should offer the
 * developer Pro toggle on top of it.
 */
export function createUnavailablePurchaseService(): PurchaseService {
  return {
    isDev: false,

    async configure() {
      // Nothing to configure. Logged rather than thrown: a missing key must not
      // stop a reader getting to the archive, which is the whole free product.
      console.warn(
        '[purchases] No RevenueCat key in this release build — Pro cannot be sold. ' +
          'Set EXPO_PUBLIC_RC_ANDROID_KEY and rebuild.',
      );
    },

    async getOfferings(): Promise<SubscriptionPackage[]> {
      return [];
    },

    async refreshEntitlement() {
      return false;
    },

    async purchase(): Promise<PurchaseOutcome> {
      // `cancelled: true` so the paywall treats it as a dismissal and stays
      // put, rather than reporting a failure the reader can do nothing about.
      return { isPro: false, cancelled: true };
    },

    async restore() {
      return false;
    },

    subscribe() {
      return () => {};
    },
  };
}
