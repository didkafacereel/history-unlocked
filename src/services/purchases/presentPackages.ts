import { BillingPeriod, SubscriptionPackage } from './PurchaseService';

/**
 * How the paywall presents real store packages.
 *
 * The dev catalogue (`DEV_PACKAGES` in src/config/pro.ts) carries its own
 * titles, the "save 44%" line and the highlighted annual plan; RevenueCat's
 * packages carry none of that. Passed straight through, the phone showed
 * Google's product titles ("History Unlocked Pro — Monthly (History
 * Unlocked)"), no saving, nothing highlighted, and opened on whichever package
 * the offering listed first — monthly. Every one of those costs sales at the
 * one screen that makes money.
 *
 * Pure, so it is tested without the SDK. The saving is COMPUTED from the two
 * live prices, never typed: a price change, or a country where the store
 * rounds differently, moves the line with it.
 */
export interface RawStorePackage {
  id: string;
  productId: string;
  priceString: string;
  /** Numeric price in the store's currency, for the saving. */
  price: number;
  period: BillingPeriod;
}

const ORDER: Record<BillingPeriod, number> = { annual: 0, monthly: 1, lifetime: 2, unknown: 3 };

const TITLE: Record<BillingPeriod, string> = {
  annual: 'Annual',
  monthly: 'Monthly',
  lifetime: 'Founder — Lifetime',
  unknown: 'Pro',
};

const SUFFIX: Record<BillingPeriod, string> = {
  annual: ' / yr',
  monthly: ' / mo',
  lifetime: ' once',
  unknown: '',
};

/** Whole-percent saving of paying yearly over twelve months, or null if there is none to claim. */
export function annualSaving(monthlyPrice: number, annualPrice: number): number | null {
  if (!(monthlyPrice > 0) || !(annualPrice > 0)) return null;
  const saving = Math.floor((1 - annualPrice / (monthlyPrice * 12)) * 100);
  return saving >= 5 ? saving : null;
}

export function presentPackages(raw: RawStorePackage[]): SubscriptionPackage[] {
  const monthly = raw.find((p) => p.period === 'monthly');
  const annual = raw.find((p) => p.period === 'annual');
  const saving = monthly && annual ? annualSaving(monthly.price, annual.price) : null;

  return [...raw]
    .sort((a, b) => ORDER[a.period] - ORDER[b.period])
    .map((p) => {
      const out: SubscriptionPackage = {
        id: p.id,
        productId: p.productId,
        title: TITLE[p.period],
        priceString: `${p.priceString}${SUFFIX[p.period]}`,
        period: p.period,
      };
      if (p.period === 'annual') {
        out.highlight = true;
        out.subtitle = saving !== null ? `Best value — save ${saving}%` : 'Best value';
      }
      if (p.period === 'lifetime') {
        // Generation-neutral, as in DEV_PACKAGES: the seats row names the
        // generation on sale from the live count.
        out.subtitle = 'A numbered seat, and one day of the year that is yours alone';
      }
      return out;
    });
}
