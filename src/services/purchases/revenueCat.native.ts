import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PACKAGE_TYPE,
  PurchasesPackage,
} from 'react-native-purchases';

import { PRO_ENTITLEMENT_ID, PRO_OFFERING_ID, revenueCatApiKey } from '@/config/pro';

import { BillingPeriod, PurchaseOutcome, PurchaseService, SubscriptionPackage } from './PurchaseService';

/**
 * RevenueCat-backed implementation. Imported ONLY from index.native.ts, so the
 * react-native-purchases module never enters the web bundle. Activated only
 * when an API key is configured (see hasRevenueCatKeys); otherwise the native
 * factory uses the dev provider.
 */

export function hasRevenueCatKeys(): boolean {
  return revenueCatApiKey().length > 0;
}

function periodOf(pkg: PurchasesPackage): BillingPeriod {
  switch (pkg.packageType) {
    case PACKAGE_TYPE.MONTHLY:
      return 'monthly';
    case PACKAGE_TYPE.ANNUAL:
      return 'annual';
    case PACKAGE_TYPE.LIFETIME:
      return 'lifetime';
    default:
      return 'unknown';
  }
}

function isProInfo(info: CustomerInfo): boolean {
  return typeof info.entitlements.active[PRO_ENTITLEMENT_ID] !== 'undefined';
}

export function createRevenueCatService(): PurchaseService {
  // RevenueCat hands back rich package objects; the rest of the app only sees
  // our flattened SubscriptionPackage, so we keep the originals here by id.
  const packageCache = new Map<string, PurchasesPackage>();

  return {
    isDev: false,

    // Aliasing to the account is what lets a purchase survive a new phone.
    // RevenueCat merges the anonymous identity into the account on first
    // logIn, so a reader who bought before signing in keeps what they bought.
    async logIn(userId: string) {
      await Purchases.logIn(userId);
    },

    async logOut() {
      await Purchases.logOut();
    },

    async configure() {
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.WARN);
      }
      Purchases.configure({ apiKey: revenueCatApiKey() });
    },

    async getOfferings(): Promise<SubscriptionPackage[]> {
      const offerings = await Purchases.getOfferings();
      const offering = offerings.all[PRO_OFFERING_ID] ?? offerings.current;
      const available = offering?.availablePackages ?? [];

      packageCache.clear();
      return available.map((pkg) => {
        packageCache.set(pkg.identifier, pkg);
        return {
          id: pkg.identifier,
          productId: pkg.product.identifier,
          title: pkg.product.title,
          priceString: pkg.product.priceString,
          period: periodOf(pkg),
        };
      });
    },

    async refreshEntitlement() {
      return isProInfo(await Purchases.getCustomerInfo());
    },

    async purchase(packageId: string): Promise<PurchaseOutcome> {
      const pkg = packageCache.get(packageId);
      if (!pkg) {
        throw new Error(`Unknown package "${packageId}" — call getOfferings() first.`);
      }
      try {
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        return { isPro: isProInfo(customerInfo), cancelled: false };
      } catch (error) {
        if (error instanceof Object && 'userCancelled' in error && error.userCancelled) {
          return { isPro: await this.refreshEntitlement(), cancelled: true };
        }
        throw error;
      }
    },

    async restore() {
      return isProInfo(await Purchases.restorePurchases());
    },

    subscribe(listener) {
      const handler = (info: CustomerInfo) => listener(isProInfo(info));
      Purchases.addCustomerInfoUpdateListener(handler);
      return () => Purchases.removeCustomerInfoUpdateListener(handler);
    },
  };
}
