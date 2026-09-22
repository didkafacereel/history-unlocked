import { describe, expect, it } from 'vitest';

import { decideWebhook } from '../firebase/functions/src/webhook';

/**
 * The webhook decides who owns a founder seat and when it is taken away. It is
 * the only code in this repository that can destroy something a reader paid
 * $79.99 for, and until these tests existed it did exactly that, silently, in
 * the most ordinary case there is.
 *
 * Every case below is a real RevenueCat event shape, not an invented one.
 */

const LIFETIME = 'history_unlocked_pro_lifetime';
const MONTHLY = 'history_unlocked_pro_monthly';
const ANNUAL = 'history_unlocked_pro_annual';

describe('buying Lifetime', () => {
  it('grants on the one-time purchase', () => {
    expect(
      decideWebhook({
        type: 'NON_RENEWING_PURCHASE',
        app_user_id: 'uid-1',
        entitlement_ids: ['pro'],
        product_id: LIFETIME,
        period_type: 'NORMAL',
      }),
    ).toEqual({ action: 'grant', uid: 'uid-1' });
  });

  it('grants for a later generation, which is a different product id', () => {
    // Generation II and III are sold by swapping the product in the offering,
    // with no app update. A decision that matched one exact string would stop
    // granting on the day seat 123 sells.
    expect(
      decideWebhook({
        type: 'NON_RENEWING_PURCHASE',
        app_user_id: 'uid-2',
        entitlement_ids: ['pro'],
        product_id: `${LIFETIME}_gen2`,
      }),
    ).toEqual({ action: 'grant', uid: 'uid-2' });
  });

  it('grants when the product id is missing but the type says one-time', () => {
    expect(
      decideWebhook({
        type: 'NON_RENEWING_PURCHASE',
        app_user_id: 'uid-3',
        entitlement_ids: ['pro'],
      }),
    ).toEqual({ action: 'grant', uid: 'uid-3' });
  });
});

describe('subscriptions never touch the registry', () => {
  it('ignores a new monthly subscriber', () => {
    const decision = decideWebhook({
      type: 'INITIAL_PURCHASE',
      app_user_id: 'uid-4',
      entitlement_ids: ['pro'],
      product_id: MONTHLY,
      period_type: 'NORMAL',
    });
    expect(decision.action).toBe('ignore');
  });

  /**
   * THE BUG THIS FILE EXISTS FOR.
   *
   * A founder who also holds a monthly subscription turns off auto-renew —
   * the rational thing to do once you own Lifetime. RevenueCat sends
   * CANCELLATION carrying the `pro` entitlement, because all three products
   * grant it. The old decision revoked on any such event: the seat was nulled,
   * the keeper document deleted, and the day put back on sale while the
   * subscription was still running.
   */
  it('does not revoke Lifetime when a monthly subscription is cancelled', () => {
    const decision = decideWebhook({
      type: 'CANCELLATION',
      app_user_id: 'founder',
      entitlement_ids: ['pro'],
      product_id: MONTHLY,
    });
    expect(decision).toEqual({ action: 'ignore', reason: 'revoke-for-a-subscription' });
  });

  it('does not revoke Lifetime when an annual subscription expires', () => {
    expect(
      decideWebhook({
        type: 'EXPIRATION',
        app_user_id: 'founder',
        entitlement_ids: ['pro'],
        product_id: ANNUAL,
      }).action,
    ).toBe('ignore');
  });

  it('does not revoke on a billing issue or a pause of a subscription', () => {
    expect(
      decideWebhook({
        type: 'SUBSCRIPTION_PAUSED',
        app_user_id: 'founder',
        entitlement_ids: ['pro'],
        product_id: MONTHLY,
      }).action,
    ).toBe('ignore');
  });
});

describe('losing Lifetime', () => {
  it('revokes on a refund of the lifetime product', () => {
    // Without this, someone buys, takes 29 February, refunds, and keeps the
    // best day in the calendar for nothing.
    expect(
      decideWebhook({
        type: 'REFUND',
        app_user_id: 'uid-5',
        entitlement_ids: ['pro'],
        product_id: LIFETIME,
      }),
    ).toEqual({ action: 'revoke', uid: 'uid-5' });
  });

  it('revokes on a cancellation of the lifetime product', () => {
    // For a non-renewing purchase, CANCELLATION is how a refund arrives.
    expect(
      decideWebhook({
        type: 'CANCELLATION',
        app_user_id: 'uid-6',
        entitlement_ids: ['pro'],
        product_id: `${LIFETIME}_gen3`,
      }).action,
    ).toBe('revoke');
  });

  it('refuses to guess when a revoke carries no product id, and says so', () => {
    // Deliberately does NOT revoke. Both mistakes cost one day and both need a
    // human; only one of them also takes money from somebody who did nothing.
    const decision = decideWebhook({
      type: 'REFUND',
      app_user_id: 'uid-7',
      entitlement_ids: ['pro'],
    });
    expect(decision).toEqual({
      action: 'ignore',
      reason: 'revoke-without-a-product-id',
      alarming: true,
    });
  });
});

describe('transfer — the designed purchase path', () => {
  /**
   * Buying needs no account; claiming does. So the ordinary reader buys as an
   * anonymous RevenueCat id and signs in afterwards, which moves the purchase
   * and announces it with TRANSFER. Ignoring it left the money on an id nobody
   * can sign in as, and the buyer with a 403 on the day they had just paid for.
   */
  it('moves the standing to the signed-in account', () => {
    expect(
      decideWebhook({
        type: 'TRANSFER',
        transferred_from: ['$RCAnonymousID:abc123'],
        transferred_to: ['firebase-uid-9'],
      }),
    ).toEqual({ action: 'transfer', from: ['$RCAnonymousID:abc123'], to: 'firebase-uid-9' });
  });

  it('is decided before the entitlement check, because TRANSFER carries none', () => {
    const decision = decideWebhook({
      type: 'TRANSFER',
      transferred_from: ['old'],
      transferred_to: ['new'],
      entitlement_ids: [],
    });
    expect(decision.action).toBe('transfer');
  });

  it('asks for a human when a transfer is missing one of its ends', () => {
    expect(
      decideWebhook({ type: 'TRANSFER', transferred_from: [], transferred_to: ['new'] }),
    ).toEqual({ action: 'ignore', reason: 'transfer-without-both-ends', alarming: true });
  });
});

describe('everything else', () => {
  it('ignores an event that does not touch pro at all', () => {
    expect(
      decideWebhook({
        type: 'INITIAL_PURCHASE',
        app_user_id: 'uid-8',
        entitlement_ids: ['something_else'],
        product_id: 'other',
      }),
    ).toEqual({ action: 'ignore', reason: 'not-pro' });
  });

  it('ignores a renewal — the registry is only ever about founders', () => {
    expect(
      decideWebhook({
        type: 'RENEWAL',
        app_user_id: 'uid-9',
        entitlement_ids: ['pro'],
        product_id: ANNUAL,
      }).action,
    ).toBe('ignore');
  });

  it('survives an empty body without throwing', () => {
    expect(decideWebhook({}).action).toBe('ignore');
  });

  it('survives null entitlements', () => {
    expect(decideWebhook({ type: 'REFUND', app_user_id: 'u', entitlement_ids: null }).action).toBe(
      'ignore',
    );
  });
});
