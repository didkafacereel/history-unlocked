import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { defineSecret } from 'firebase-functions/params';
import { onRequest, Request } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import type { Response } from 'express';

import { cleanDisplayName, isValidDateKey, WELCOME_CAP } from './constants';
import {
  allocateSeat,
  claimDate,
  deleteAccountData,
  readEntitlement,
  readKeeper,
  readKeptDates,
  readSeatsTaken,
  setLifetime,
  transferAccount,
} from './store';
import { decideWebhook, type RevenueCatEvent } from './webhook';
import { claimWelcome, deleteWelcome, readWelcome, readWelcomeGranted } from './welcome';

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

    // ── The launch gift: how many weeks are left, and whether this reader has one
    //
    // Open, because the launch screen shows "N of 5,000 left" to a reader who
    // has not signed in yet — that line is the reason to sign in. `serverNow`
    // lets the app measure its own clock against ours, so moving the phone's
    // date forward does not end a week early or backward stretch it.
    if (req.method === 'GET' && path === '/welcome') {
      const [granted, viewer] = await Promise.all([readWelcomeGranted(), uidOf(req)]);
      send(res, 200, {
        cap: WELCOME_CAP,
        remaining: Math.max(WELCOME_CAP - granted, 0),
        mine: viewer ? await readWelcome(viewer) : null,
        serverNow: Date.now(),
      });
      return;
    }

    // ── Everything below needs a verified reader ────────────────────────────
    const uid = await uidOf(req);
    if (!uid) {
      send(res, 401, { error: 'unauthenticated' });
      return;
    }

    if (req.method === 'POST' && path === '/welcome') {
      const now = Date.now();
      const result = await claimWelcome(uid, now);
      send(res, 200, { ...result, serverNow: now });
      return;
    }

    if (req.method === 'GET' && path === '/founders/me') {
      const [mine, seatsTaken] = await Promise.all([readEntitlement(uid), readSeatsTaken()]);
      send(res, 200, {
        /**
         * `lifetime` is sent so the app can tell "not a founder" from "a
         * founder whose seat never got allocated", and fix the second on its
         * own. It reports what the SERVER believes, which is the only opinion
         * that counts — the device's cached Pro flag says nothing about which
         * product was bought, and a founder restoring on a new phone has no
         * local state at all.
         */
        lifetime: mine.lifetime === true,
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
        lifetime: true,
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
          lifetime: mine.lifetime === true,
          seat: mine.seat,
          keptDate: mine.keptDate,
          displayName: mine.displayName,
          seatsTaken,
        },
      });
      return;
    }

    /**
     * Delete the account, and everything the server holds because of it.
     *
     * Required by Google Play of any app that lets people create an account,
     * and the requirement has two halves — this endpoint, and the page at
     * `docs/delete-account.html` for someone who has already uninstalled.
     *
     * DELETE is the honest verb; POST is accepted because a browser form on
     * that page can only send POST, and a reader who has uninstalled the app
     * has nothing else to call this with.
     *
     * ORDER IS LOAD-BEARING. Firestore first, the Auth user second. Deleting
     * the account first would leave someone unable to authenticate a retry, so
     * a failure at the second step would strand their name in the public
     * register permanently. This way a failure leaves an empty account they can
     * simply delete again.
     */
    if ((req.method === 'DELETE' || req.method === 'POST') && path === '/account') {
      try {
        await deleteAccountData(uid);
        await deleteWelcome(uid);
        await getAuth().deleteUser(uid);
      } catch (error) {
        // Already gone is the outcome the caller asked for, not a failure —
        // and it is what a retry after a half-finished delete looks like.
        if ((error as { code?: string }).code === 'auth/user-not-found') {
          send(res, 200, { ok: true });
          return;
        }
        logger.error('account deletion failed', { uid, error });
        send(res, 500, { ok: false });
        return;
      }
      send(res, 200, { ok: true });
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

    const event = (req.body?.event ?? {}) as RevenueCatEvent;
    const decision = decideWebhook(event);

    try {
      switch (decision.action) {
        case 'grant':
          await setLifetime(decision.uid, true);
          /**
           * THE SEAT IS ALLOCATED HERE, not by the app.
           *
           * It used to be the client's job: the paywall bought, then called
           * `POST /founders/seat` immediately. That call raced this webhook and
           * usually lost — the server had not been told about the purchase yet,
           * so it answered 403 `no-lifetime`. The client swallowed it, nothing
           * retried, and the reader had paid $79.99 for a seat that was never
           * allocated by any code path afterwards.
           *
           * The moment the server learns somebody paid is the right moment to
           * give them a number. `allocateSeat` is idempotent, so the old client
           * call still works and simply finds the seat already there.
           */
          await allocateSeat(decision.uid);
          break;
        case 'revoke':
          await setLifetime(decision.uid, false);
          break;
        case 'transfer':
          await transferAccount(decision.from, decision.to);
          break;
        case 'ignore':
          if (decision.alarming) {
            // Not an error we can act on, and not one to lose either: it means
            // an event about our own entitlement that could not be read
            // confidently. A day may need releasing by hand.
            logger.error('revenuecat webhook needs a human', {
              reason: decision.reason,
              type: event.type,
            });
          }
          break;
      }
    } catch (error) {
      logger.error('revenuecat webhook failed', { decision, error });
      // 500 so RevenueCat retries. Silently swallowing a grant would leave
      // somebody who paid without a seat and no trace of why.
      send(res, 500, { error: 'failed' });
      return;
    }

    send(res, 200, { ok: true, action: decision.action });
  },
);
