/**
 * The billing boundary. The whole app talks to Pro through this interface and
 * NEVER imports RevenueCat directly — so the store, screens, and gating
 * primitives are billing-provider-agnostic and fully testable with the dev
 * implementation (which also runs on web, where RevenueCat does not exist).
 *
 * Platform resolution (Metro):
 *   web / typecheck → index.ts        → dev provider
 *   native build    → index.native.ts → RevenueCat if keys present, else dev
 */

export type BillingPeriod = 'monthly' | 'annual' | 'lifetime' | 'unknown';

export interface SubscriptionPackage {
  /** Provider package identifier, passed back to purchase(). */
  id: string;
  productId: string;
  title: string;
  /** Localized, currency-formatted price (e.g. "$4.99"). */
  priceString: string;
  period: BillingPeriod;
  /** Optional marketing line, e.g. "Save 50%". */
  subtitle?: string;
  /** The package the paywall should pre-select / emphasize. */
  highlight?: boolean;
}

export interface PurchaseOutcome {
  isPro: boolean;
  /** True when the user dismissed the native purchase sheet. */
  cancelled: boolean;
}

export interface PurchaseService {
  /** Configure the SDK. Safe to call repeatedly; the store calls it once. */
  configure(): Promise<void>;
  /** Available packages for the active offering. */
  getOfferings(): Promise<SubscriptionPackage[]>;
  /** Re-read the current Pro entitlement from the provider. */
  refreshEntitlement(): Promise<boolean>;
  purchase(packageId: string): Promise<PurchaseOutcome>;
  /** Restore prior purchases; resolves to the resulting Pro state. */
  restore(): Promise<boolean>;
  /** Subscribe to entitlement changes (cross-device, renewals). Returns an unsubscribe. */
  subscribe(listener: (isPro: boolean) => void): () => void;
  /**
   * Re-key the provider to a signed-in account, so entitlement follows the
   * person rather than the handset. Optional: the dev provider has no notion
   * of accounts and simply omits it.
   */
  logIn?(userId: string): Promise<void>;
  /** Return to an anonymous, device-scoped identity. */
  logOut?(): Promise<void>;
  /** True for the mock provider — gates the dev-only Pro toggle. */
  readonly isDev: boolean;
  /** Dev provider only: force the entitlement (used by the __DEV__ toggle). */
  devSetPro?(value: boolean): Promise<void>;
}
