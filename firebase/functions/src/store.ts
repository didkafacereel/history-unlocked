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
