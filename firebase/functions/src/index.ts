import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { defineSecret } from 'firebase-functions/params';
import { onRequest, Request } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import type { Response } from 'express';

import { cleanDisplayName, isValidDateKey } from './constants';
import {
  allocateSeat,
  claimDate,
  readEntitlement,
  readKeeper,
  readKeptDates,
  readSeatsTaken,
  setLifetime,
} from './store';

initializeApp();

/**
 * One HTTP function, routed by path.
 *
 * Five separate functions would mean five URLs, and the app builds its calls as
 * `${baseUrl}/founders/...` — a shape chosen before any of this existed and
 * worth keeping, because it is also what a plain REST server would offer if
 * this ever moves off Firebase.
 *
 * `maxInstances` is the real spend cap. A Blaze budget alert emails you after
 * the money is gone; this stops a loop or a flood from scaling into a bill in
 * the first place. Ten concurrent instances is far past what 366 seats will
 * ever need.
 */
const REGION = 'europe-west1';

/**
 * Shared with RevenueCat, set once with:
 *   firebase functions:secrets:set REVENUECAT_WEBHOOK_SECRET
 *
 * Without it the webhook refuses everything. That is the correct failure: an
 * unauthenticated endpoint that grants Lifetime is the whole product given
 * away to anyone who finds the URL.
 */
const REVENUECAT_WEBHOOK_SECRET = defineSecret('REVENUECAT_WEBHOOK_SECRET');

function send(res: Response, status: number, body: unknown): void {
  res.status(status).json(body);
}

/**
 * The uid behind the request, or null.
 *
 * Verified cryptographically by the Admin SDK. This is the whole reason the
 * client sends a Firebase ID token rather than the RevenueCat user id it used
 * to send: an id in a header is a claim anybody can make, and a seat is worth
 * $79.99.
 */
async function uidOf(req: Request): Promise<string | null> {
  const header = req.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return null;
  }
  try {
    return (await getAuth().verifyIdToken(token)).uid;
  } catch {
    // An expired or forged token is simply not signed in. Nothing to report to
    // the caller beyond that, and nothing worth logging at volume.
    return null;
  }
}

export const api = onRequest(
  {
    region: REGION,
    maxInstances: 10,
    cors: true,
    secrets: [REVENUECAT_WEBHOOK_SECRET],
  },
  async (req, res) => {
    const path = req.path.replace(/\/+$/, '');

    // ── The register, open to everyone ──────────────────────────────────────
    //
    // No token required. The calendar of free days is the strongest argument
    // the Lifetime tier has, and a screen that sells the tier cannot require
    // it. The NAMES are the part that is held back, and it is held back here
    // rather than in the app: filtering on the device would be decoration,
    // because the payload would already be on the device.
    if (req.method === 'GET' && path === '/founders/dates') {
      const [dates, uid] = await Promise.all([readKeptDates(), uidOf(req)]);
      const viewer = uid ? await readEntitlement(uid) : null;
      const isFounder = viewer?.lifetime === true && typeof viewer.seat === 'number';
      if (isFounder) {
        send(res, 200, dates);
        return;
      }
      const blanked: Record<string, string> = {};
      for (const dateKey of Object.keys(dates)) {
        blanked[dateKey] = '';
      }
      send(res, 200, blanked);
      return;
    }

    if (req.method === 'GET' && path.startsWith('/founders/date/')) {
      const dateKey = path.slice('/founders/date/'.length);
      if (!isValidDateKey(dateKey)) {
        send(res, 400, { error: 'bad-date' });
        return;
      }
      const name = await readKeeper(dateKey);
      send(res, 200, {
        dateKey,
        keepers: name === null ? [] : [name],
        free: name === null,
      });
      return;
    }

    // ── Everything below needs a verified reader ────────────────────────────
    const uid = await uidOf(req);
    if (!uid) {
      send(res, 401, { error: 'unauthenticated' });
      return;
    }

    if (req.method === 'GET' && path === '/founders/me') {
      const [mine, seatsTaken] = await Promise.all([readEntitlement(uid), readSeatsTaken()]);
      send(res, 200, {
        seat: mine.seat,
        keptDate: mine.keptDate,
        displayName: mine.displayName,
        seatsTaken,
      });
      return;
    }

    if (req.method === 'POST' && path === '/founders/seat') {
      const mine = await readEntitlement(uid);
      // The entitlement is written by the webhook, never by the client, so
      // this is the point where "they paid" stops being the app's word for it.
      if (!mine.lifetime) {
        send(res, 403, { error: 'no-lifetime' });
        return;
      }
      const result = await allocateSeat(uid);
      if (!result.ok) {
        send(res, 409, { error: 'sold-out' });
        return;
      }
      send(res, 200, {
        seat: result.seat,
        keptDate: mine.keptDate,
        displayName: mine.displayName,
        seatsTaken: result.seatsTaken,
      });
      return;
    }

    if (req.method === 'POST' && path.startsWith('/founders/date/')) {
      const dateKey = path.slice('/founders/date/'.length);
      if (!isValidDateKey(dateKey)) {
        send(res, 400, { ok: false, reason: 'unavailable' });
        return;
      }
      const body = (req.body ?? {}) as { displayName?: unknown };
      const displayName = cleanDisplayName(body.displayName);
      if (!displayName) {
        send(res, 400, { ok: false, reason: 'unavailable' });
        return;
      }
      const outcome = await claimDate(uid, dateKey, displayName);
      if (!outcome.ok) {
        send(res, 409, { ok: false, reason: outcome.reason });
        return;
      }
      const [mine, seatsTaken] = await Promise.all([readEntitlement(uid), readSeatsTaken()]);
      send(res, 200, {
        ok: true,
        status: {
          seat: mine.seat,
          keptDate: mine.keptDate,
          displayName: mine.displayName,
          seatsTaken,
        },
      });
      return;
    }

    send(res, 404, { error: 'not-found' });
  },
);

/**
 * RevenueCat tells us who owns Lifetime, and when they stop.
 *
 * The app never gets to assert entitlement — it says "I bought it" and this
 * says whether that is true. The revocation half matters as much as the grant:
 * without it a refunded founder keeps their day forever, and there are only
 * 366 days.
 *
 * `app_user_id` IS the Firebase uid. The app calls `Purchases.logIn(uid)` when
 * the reader signs in, precisely so there is nothing to translate here and no
 * seam where the two identities can disagree.
 */
export const revenuecat = onRequest(
  { region: REGION, maxInstances: 5, secrets: [REVENUECAT_WEBHOOK_SECRET] },
  async (req, res) => {
    const expected = REVENUECAT_WEBHOOK_SECRET.value();
    if (!expected || req.get('authorization') !== `Bearer ${expected}`) {
      // 401 rather than 403, and no detail: an endpoint that explains why a
      // secret was wrong is an endpoint that helps someone guess it.
      send(res, 401, { error: 'unauthenticated' });
      return;
    }

    const event = (req.body?.event ?? {}) as {
      type?: string;
      app_user_id?: string;
      entitlement_ids?: string[];
      period_type?: string;
    };
    const uid = typeof event.app_user_id === 'string' ? event.app_user_id : '';
    if (!uid) {
      send(res, 200, { ignored: 'no-user' });
      return;
    }

    // Only the lifetime entitlement moves the needle here. A monthly or annual
    // subscriber is Pro, which the app learns from RevenueCat directly; this
    // registry is only ever about founders.
    const touchesPro = (event.entitlement_ids ?? []).includes('pro');
    const isLifetime = event.period_type === 'LIFETIME' || event.type === 'NON_RENEWING_PURCHASE';

    const GRANT = new Set(['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE', 'UNCANCELLATION']);
    const REVOKE = new Set(['CANCELLATION', 'EXPIRATION', 'REFUND', 'SUBSCRIPTION_PAUSED']);

    const type = event.type ?? '';
    try {
      if (touchesPro && isLifetime && GRANT.has(type)) {
        await setLifetime(uid, true);
      } else if (touchesPro && REVOKE.has(type)) {
        // Revoked without checking period_type: a refund event does not always
        // repeat it, and wrongly keeping a day is worse than wrongly freeing
        // one — the second is recoverable by claiming again, the first is a
        // day nobody can ever buy.
        await setLifetime(uid, false);
      }
    } catch (error) {
      logger.error('revenuecat webhook failed', { type, uid, error });
      // 500 so RevenueCat retries. Silently swallowing a grant would leave
      // somebody who paid without a seat and no trace of why.
      send(res, 500, { error: 'failed' });
      return;
    }

    send(res, 200, { ok: true });
  },
);
