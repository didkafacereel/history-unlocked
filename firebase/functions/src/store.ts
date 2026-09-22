import { getFirestore, FieldValue, Transaction } from 'firebase-admin/firestore';

import { FOUNDER_SEATS } from './constants';

/**
 * Every read and write the founders registry makes.
 *
 * Kept in one file so the data model is readable in one sitting, and so the
 * two places that must stay in step — the per-date document and the aggregate
 * the calendar reads — can only be changed together.
 */

export interface Entitlement {
  /** True while RevenueCat says this person owns Lifetime. */
  lifetime: boolean;
  /** 1-based, allocated once, never reused. Null until allocated. */
  seat: number | null;
  /** "MM-DD" they keep, or null. */
  keptDate: string | null;
  /** The name shown on that date. */
  displayName: string;
}

export const EMPTY: Entitlement = {
  lifetime: false,
  seat: null,
  keptDate: null,
  displayName: '',
};

export const db = () => getFirestore();

const entitlementRef = (uid: string) => db().collection('entitlements').doc(uid);
const keeperRef = (dateKey: string) => db().collection('keepers').doc(dateKey);
const seatsRef = () => db().collection('counters').doc('seats');

/**
 * The whole year in one document.
 *
 * The calendar needs every date before it can draw a single cell. Reading the
 * `keepers` collection would be up to 366 document reads for one screen open,
 * which at Firestore's free 50,000 a day is about 136 opens before it starts
 * costing money — for a screen whose whole purpose is to be browsed. This is
 * one read, and it is written inside the same transaction as the claim, so it
 * cannot drift from the documents it summarises.
 *
 * 366 entries of a name and a uid is roughly 30 KB against a 1 MiB document
 * limit, so it does not need paging and will not grow into needing it.
 */
const registryRef = () => db().collection('registry').doc('dates');

export async function readEntitlement(uid: string): Promise<Entitlement> {
  const snap = await entitlementRef(uid).get();
  return snap.exists ? { ...EMPTY, ...(snap.data() as Partial<Entitlement>) } : EMPTY;
}

export async function readSeatsTaken(): Promise<number> {
  const snap = await seatsRef().get();
  const taken = snap.exists ? (snap.data()?.taken as unknown) : 0;
  return typeof taken === 'number' && taken >= 0 ? taken : 0;
}

/** "MM-DD" to keeper name, for the calendar. Empty when nothing is claimed. */
export async function readKeptDates(): Promise<Record<string, string>> {
  const snap = await registryRef().get();
  if (!snap.exists) {
    return {};
  }
  const data = snap.data() ?? {};
  const out: Record<string, string> = {};
  for (const [dateKey, name] of Object.entries(data)) {
    if (typeof name === 'string') {
      out[dateKey] = name;
    }
  }
  return out;
}

export async function readKeeper(dateKey: string): Promise<string | null> {
  const snap = await keeperRef(dateKey).get();
  if (!snap.exists) {
    return null;
  }
  const name = snap.data()?.name as unknown;
  return typeof name === 'string' ? name : '';
}

export type SeatResult =
  | { ok: true; seat: number; seatsTaken: number }
  | { ok: false; reason: 'sold-out' };

/**
 * Allocate this reader a seat, once.
 *
 * Idempotent on purpose: `claimSeat` is called after every lifetime purchase
 * and again on any path that suspects it may not have run, so calling it twice
 * has to be safe rather than merely unlikely.
 *
 * The counter is read and written inside the transaction, which is what stops
 * two simultaneous purchases being handed the same number.
 */
export async function allocateSeat(uid: string): Promise<SeatResult> {
  return db().runTransaction(async (tx: Transaction) => {
    const [mineSnap, seatsSnap] = await Promise.all([
      tx.get(entitlementRef(uid)),
      tx.get(seatsRef()),
    ]);

    const mine = mineSnap.exists ? (mineSnap.data() as Partial<Entitlement>) : {};
    const takenRaw = seatsSnap.exists ? (seatsSnap.data()?.taken as unknown) : 0;
    const taken = typeof takenRaw === 'number' && takenRaw >= 0 ? takenRaw : 0;

    if (typeof mine.seat === 'number') {
      return { ok: true as const, seat: mine.seat, seatsTaken: taken };
    }
    if (taken >= FOUNDER_SEATS) {
      return { ok: false as const, reason: 'sold-out' as const };
    }

    const seat = taken + 1;
    tx.set(seatsRef(), { taken: seat }, { merge: true });
    tx.set(entitlementRef(uid), { seat, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return { ok: true as const, seat, seatsTaken: seat };
  });
}

export type ClaimOutcome =
  | { ok: true }
  | { ok: false; reason: 'taken' | 'already-claimed' | 'not-a-founder' };

/**
 * Keep a date, once, for one person.
 *
 * The guarantee is the document id: `keepers/03-07` either exists or it does
 * not, and a transaction that reads it as absent and then creates it cannot be
 * interleaved with another doing the same. Two people tapping the same day in
 * the same second means one of them is told it is taken — which is the honest
 * answer, and the reason this is not a check in the app.
 */
export async function claimDate(
  uid: string,
  dateKey: string,
  displayName: string,
): Promise<ClaimOutcome> {
  return db().runTransaction(async (tx: Transaction) => {
    const [mineSnap, keeperSnap, registrySnap] = await Promise.all([
      tx.get(entitlementRef(uid)),
      tx.get(keeperRef(dateKey)),
      tx.get(registryRef()),
    ]);

    const mine: Partial<Entitlement> = mineSnap.exists
      ? (mineSnap.data() as Partial<Entitlement>)
      : {};

    if (mine.lifetime !== true || typeof mine.seat !== 'number') {
      return { ok: false as const, reason: 'not-a-founder' as const };
    }
    if (typeof mine.keptDate === 'string' && mine.keptDate.length > 0) {
      return { ok: false as const, reason: 'already-claimed' as const };
    }
    if (keeperSnap.exists) {
      return { ok: false as const, reason: 'taken' as const };
    }

    tx.set(keeperRef(dateKey), {
      uid,
      name: displayName,
      claimedAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      entitlementRef(uid),
      { keptDate: dateKey, displayName, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    // Written here, in the same transaction, so the summary the calendar reads
    // can never show a date the authoritative document disagrees about.
    tx.set(registryRef(), { ...(registrySnap.data() ?? {}), [dateKey]: displayName });
    return { ok: true as const };
  });
}

/**
 * Move a founder's standing from one app-user id to another.
 *
 * RevenueCat sends TRANSFER when a purchase changes hands between ids, and the
 * ordinary way that happens here is the designed one: buying needs no account,
 * so the purchase lands on an anonymous id and moves to the Firebase uid the
 * moment the reader signs in to claim their day.
 *
 * Moving the entitlement is the obvious half. The half that is easy to miss is
 * `keepers/{MM-DD}.uid` — the document that IS the claim. Leave it pointing at
 * the old id and the founder's name stands on their day while the account that
 * owns it can never be signed in as again, so deleting the account would not
 * release it and support has nothing to match it against.
 *
 * `registry/dates` holds names only, never ids, so it needs no change.
 *
 * Idempotent: a repeat, or a transfer whose destination already holds Lifetime,
 * tidies the source away and reports success. Returns false when there was
 * nothing to move, which is the common case — most transfers are of
 * subscriptions this registry does not care about.
 */
export async function transferAccount(fromUids: string[], toUid: string): Promise<boolean> {
  return db().runTransaction(async (tx: Transaction) => {
    // Every read first. Firestore refuses a read that follows a write in the
    // same transaction, and the failure would only appear on the path where a
    // date is actually held.
    const sourceSnaps = await Promise.all(fromUids.map((uid) => tx.get(entitlementRef(uid))));
    const destSnap = await tx.get(entitlementRef(toUid));

    let sourceUid: string | null = null;
    let source: Partial<Entitlement> = {};
    for (const [index, snap] of sourceSnaps.entries()) {
      const data = snap.exists ? (snap.data() as Partial<Entitlement>) : {};
      if (data.lifetime === true) {
        sourceUid = fromUids[index] ?? null;
        source = data;
        break;
      }
    }
    if (sourceUid === null) {
      return false;
    }

    const held =
      typeof source.keptDate === 'string' && source.keptDate.length > 0 ? source.keptDate : null;
    const keeperSnap = held ? await tx.get(keeperRef(held)) : null;

    // ── reads done ──────────────────────────────────────────────────────────

    const dest = destSnap.exists ? (destSnap.data() as Partial<Entitlement>) : {};
    if (dest.lifetime === true) {
      tx.delete(entitlementRef(sourceUid));
      return true;
    }

    tx.set(
      entitlementRef(toUid),
      {
        lifetime: true,
        seat: typeof source.seat === 'number' ? source.seat : null,
        keptDate: held,
        displayName: typeof source.displayName === 'string' ? source.displayName : '',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    if (held && keeperSnap?.exists) {
      tx.set(keeperRef(held), { uid: toUid }, { merge: true });
    }
    tx.delete(entitlementRef(sourceUid));
    return true;
  });
}

/**
 * Erase everything the server holds about a reader, and release their day.
 *
 * Google Play requires any app that lets people create an account to let them
 * delete it — from inside the app and from a web page, without installing
 * anything. A support mailbox does not satisfy it, which is why this is an
 * endpoint rather than the address the wrong-day path uses.
 *
 * The seat counter is NOT decremented, for the same reason a refund does not
 * decrement it: a seat number is an identity, not a place in a queue, and
 * reissuing #37 would put two people's badges on the same number. Deletion
 * therefore costs a seat permanently, which errs toward fewer seats than days —
 * the only safe direction, because the opposite sells a date that does not
 * exist.
 *
 * Every read happens before the first write: a Firestore transaction refuses to
 * read after writing, and the failure only appears when a date is actually held.
 */
export async function deleteAccountData(uid: string): Promise<void> {
  await db().runTransaction(async (tx: Transaction) => {
    const mineSnap = await tx.get(entitlementRef(uid));
    const mine: Partial<Entitlement> = mineSnap.exists
      ? (mineSnap.data() as Partial<Entitlement>)
      : {};

    const held =
      typeof mine.keptDate === 'string' && mine.keptDate.length > 0 ? mine.keptDate : null;
    const registrySnap = held ? await tx.get(registryRef()) : null;

    if (held && registrySnap) {
      const registry = { ...(registrySnap.data() ?? {}) };
      delete registry[held];
      tx.delete(keeperRef(held));
      tx.set(registryRef(), registry);
    }
    tx.delete(entitlementRef(uid));
  });
}

/**
 * Turn Lifetime on or off for a reader, and release their day when it goes off.
 *
 * Called only by the RevenueCat webhook. Without the release half, someone buys
 * Lifetime, takes 29 February, refunds, and keeps the best day in the calendar
 * for nothing — and there are only 366 of them.
 *
 * The seat counter is NOT decremented on a revoke, deliberately. Reusing a seat
 * number would give two people "Founder #37", and the number is an identity
 * rather than a quota line. The cost is that refunds slowly reduce how many
 * seats can ever be sold, which errs toward fewer seats than days — the safe
 * direction, because it can never promise a date that does not exist.
 */
export async function setLifetime(uid: string, lifetime: boolean): Promise<void> {
  await db().runTransaction(async (tx: Transaction) => {
    const mineSnap = await tx.get(entitlementRef(uid));
    const mine: Partial<Entitlement> = mineSnap.exists
      ? (mineSnap.data() as Partial<Entitlement>)
      : {};

    if (lifetime) {
      tx.set(
        entitlementRef(uid),
        { lifetime: true, updatedAt: FieldValue.serverTimestamp() },
        { merge: true },
      );
      return;
    }

    const held = typeof mine.keptDate === 'string' ? mine.keptDate : null;
    if (held) {
      const registrySnap = await tx.get(registryRef());
      const registry = { ...(registrySnap.data() ?? {}) };
      delete registry[held];
      tx.delete(keeperRef(held));
      tx.set(registryRef(), registry);
    }
    tx.set(
      entitlementRef(uid),
      {
        lifetime: false,
        keptDate: null,
        seat: null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}
