/**
 * What a RevenueCat event means for the founders registry.
 *
 * Pure, and in its own file, because this is the code that decides whether
 * somebody keeps a day they paid $79.99 for. It used to live inline in the HTTP
 * handler where nothing could test it, and it was wrong in a way nobody could
 * see: the revoke branch fired on ANY event touching the `pro` entitlement,
 * without checking which product it was about.
 *
 * All three products grant `pro`. So a founder who also held a monthly
 * subscription and then turned off auto-renew — the rational thing to do after
 * buying Lifetime — sent a CANCELLATION carrying `pro`, and the registry
 * released their day for somebody else to take. `tests/foundersWebhook.test.ts`
 * is that scenario, written down.
 *
 * The product id is what settles it now. `period_type` was the obvious
 * discriminator and is not reliable: a refund does not always repeat it.
 */

/**
 * Every lifetime product, across the three generations. `store/BILLING-SETUP.md`
 * names them: the second and third are `..._lifetime_gen2` / `_gen3`, sold by
 * swapping the product in the offering rather than by shipping an app update —
 * so this has to match the family, not one string.
 */
const LIFETIME_PRODUCT_PREFIX = 'history_unlocked_pro_lifetime';

const PRO_ENTITLEMENT = 'pro';

const GRANT_TYPES = new Set(['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE', 'UNCANCELLATION']);
const REVOKE_TYPES = new Set(['CANCELLATION', 'EXPIRATION', 'REFUND', 'SUBSCRIPTION_PAUSED']);

export interface RevenueCatEvent {
  type?: string;
  app_user_id?: string;
  entitlement_ids?: string[] | null;
  period_type?: string;
  product_id?: string;
  /** TRANSFER only: the ids that lost the purchase. */
  transferred_from?: string[];
  /** TRANSFER only: the ids that gained it. */
  transferred_to?: string[];
  /** PLAY_STORE, APP_STORE, … or PROMOTIONAL for an entitlement granted free. */
  store?: string;
}

export type WebhookDecision =
  | { action: 'grant'; uid: string }
  | { action: 'revoke'; uid: string }
  | { action: 'transfer'; from: string[]; to: string }
  /** `alarming` means a human should look: the event was about us and unclear. */
  | { action: 'ignore'; reason: string; alarming?: true };

export function decideWebhook(event: RevenueCatEvent): WebhookDecision {
  const type = event.type ?? '';

  /**
   * TRANSFER first, and before the entitlement check, because it does not carry
   * entitlements or a single `app_user_id` — it carries two lists.
   *
   * This is not an edge case, it is the DESIGNED purchase path. Buying needs no
   * account, so a reader who buys before signing in is an anonymous RevenueCat
   * id; signing in afterwards moves the purchase to their Firebase uid and
   * announces it with exactly this event. Ignoring it — which is what happened
   * before — left the money with an id nobody can sign in as, and the buyer
   * with a 403 when they tried to claim the day they had just paid for.
   */
  if (type === 'TRANSFER') {
    const to = event.transferred_to?.find((id) => typeof id === 'string' && id.length > 0) ?? '';
    const from = (event.transferred_from ?? []).filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    );
    if (!to || from.length === 0) {
      return { action: 'ignore', reason: 'transfer-without-both-ends', alarming: true };
    }
    return { action: 'transfer', from, to };
  }

  const uid = typeof event.app_user_id === 'string' ? event.app_user_id : '';
  if (!uid) {
    return { action: 'ignore', reason: 'no-user' };
  }

  /**
   * A promotional entitlement is a gift, never a purchase — and it arrives as
   * NON_RENEWING_PURCHASE, often with no product id, which the fallback below
   * would read as Lifetime and answer with a founder seat and a day. The launch
   * week is granted by our own server today, but anything granted by hand in
   * the RevenueCat dashboard would come through here.
   */
  if (event.store === 'PROMOTIONAL') {
    return { action: 'ignore', reason: 'promotional' };
  }

  if (!(event.entitlement_ids ?? []).includes(PRO_ENTITLEMENT)) {
    return { action: 'ignore', reason: 'not-pro' };
  }

  const product = typeof event.product_id === 'string' ? event.product_id : '';

  /**
   * The product id decides when it is there, and only then do we fall back.
   *
   * The fallbacks are narrow on purpose. `NON_RENEWING_PURCHASE` means the
   * one-time product, which today is Lifetime and nothing else — if a
   * consumable is ever added, that stops being true and this line is where it
   * breaks, which is why the product id is tried first.
   */
  const aboutLifetime = product
    ? product.startsWith(LIFETIME_PRODUCT_PREFIX)
    : type === 'NON_RENEWING_PURCHASE' || event.period_type === 'LIFETIME';

  if (GRANT_TYPES.has(type)) {
    return aboutLifetime
      ? { action: 'grant', uid }
      : { action: 'ignore', reason: 'grant-for-a-subscription' };
  }

  if (REVOKE_TYPES.has(type)) {
    if (aboutLifetime) {
      return { action: 'revoke', uid };
    }
    if (product) {
      // A subscription ending. This is the bug that was here: it used to
      // destroy the founder seat of anyone who also subscribed.
      return { action: 'ignore', reason: 'revoke-for-a-subscription' };
    }
    /**
     * Touching `pro`, revoking, and no product id to say what about.
     *
     * The earlier reasoning preferred revoking on ambiguity — "wrongly keeping
     * a day is a day nobody can ever buy". That is reversed here, and
     * deliberately. Both mistakes cost one day and both need a human to undo;
     * the difference is that wrongly revoking also takes $79.99 from somebody
     * who did nothing wrong, and does it silently. So: do nothing, and say so
     * loudly enough that the day can be released by hand.
     */
    return { action: 'ignore', reason: 'revoke-without-a-product-id', alarming: true };
  }

  return { action: 'ignore', reason: `unhandled-type:${type || 'none'}` };
}
