import { describe, expect, it } from 'vitest';

import { annualSaving, presentPackages } from '../src/services/purchases/presentPackages';

/**
 * RevenueCat's packages as they arrive, in the offering's own order (monthly
 * first), with Google's product titles nowhere in sight of the reader.
 */
const RAW = [
  { id: '$rc_monthly', productId: 'history_unlocked_pro_monthly:monthly', priceString: '$5.99', price: 5.99, period: 'monthly' as const },
  { id: '$rc_annual', productId: 'history_unlocked_pro_annual:annual', priceString: '$39.99', price: 39.99, period: 'annual' as const },
  { id: '$rc_lifetime', productId: 'history_unlocked_pro_lifetime_gen1', priceString: '$79.99', price: 79.99, period: 'lifetime' as const },
];

describe('presentPackages', () => {
  it('puts annual first, then monthly, then Lifetime', () => {
    expect(presentPackages(RAW).map((p) => p.period)).toEqual(['annual', 'monthly', 'lifetime']);
  });

  it('highlights annual, so the paywall opens on it', () => {
    const out = presentPackages(RAW);
    expect(out.filter((p) => p.highlight).map((p) => p.period)).toEqual(['annual']);
  });

  it('computes the saving from the live prices — 44% at $5.99 / $39.99', () => {
    expect(presentPackages(RAW)[0]?.subtitle).toBe('Best value — save 44%');
  });

  it('uses our own titles, never the store product title', () => {
    expect(presentPackages(RAW).map((p) => p.title)).toEqual(['Annual', 'Monthly', 'Founder — Lifetime']);
  });

  it('says what the price buys: per year, per month, once', () => {
    expect(presentPackages(RAW).map((p) => p.priceString)).toEqual(['$39.99 / yr', '$5.99 / mo', '$79.99 once']);
  });

  it('keeps the id RevenueCat needs to buy', () => {
    expect(presentPackages(RAW).map((p) => p.id)).toEqual(['$rc_annual', '$rc_monthly', '$rc_lifetime']);
  });
});

describe('annualSaving', () => {
  it('rounds down, so the claim is never larger than the truth', () => {
    expect(annualSaving(5.99, 39.99)).toBe(44); // 44.37…
  });

  it('claims nothing when yearly is not meaningfully cheaper', () => {
    expect(annualSaving(5, 59)).toBeNull();
    expect(annualSaving(0, 39.99)).toBeNull();
  });
});
