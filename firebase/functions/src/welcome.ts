import { Transaction } from 'firebase-admin/firestore';

import { WELCOME_CAP, WELCOME_DAYS } from './constants';
import { db } from './store';

/**
 * The launch gift: a week of Pro for each of the first 5,000 readers to sign in.
 *
 * Granted HERE rather than through RevenueCat, on purpose. RevenueCat can grant
 * promotional entitlements, but only from a server holding its secret key, and
 * it does not exist yet — this had to work on the day it was asked for. It is
 * also simpler to reason about: one document per account, one counter, the same
 * transaction pattern that already keeps founder seats unique (and was proven
 * against the emulator with twelve simultaneous claims).
 *
 * Tied to the ACCOUNT, not the handset: reinstalling does not reset it. A
 * deleted account and a fresh sign-in could claim again — the counter still
 * caps the total, and a week of Pro is not worth building identity checks for.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface WelcomeGrant {
  /** 1-based: this reader was the Nth to claim. */
  number: number;
  /** Epoch ms, stamped by the server's clock. */
  startedAt: number;
  endsAt: number;
}

const grantRef = (uid: string) => db().collection('welcome').doc(uid);
const counterRef = () => db().collection('counters').doc('welcome');

function grantOf(data: unknown): WelcomeGrant | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Partial<WelcomeGrant>;
  return typeof d.number === 'number' && typeof d.startedAt === 'number' && typeof d.endsAt === 'number'
    ? { number: d.number, startedAt: d.startedAt, endsAt: d.endsAt }
    : null;
}

export type WelcomeDecision =
  | { action: 'existing'; grant: WelcomeGrant }
  | { action: 'grant'; grant: WelcomeGrant }
  | { action: 'sold-out' };

/**
 * What a claim should do, given what is already stored. Pure, so the rules —
 * once per account, never past the cap — are unit-tested without Firestore.
 */
export function decideWelcome(input: {
  existing: WelcomeGrant | null;
  granted: number;
  now: number;
  cap?: number;
  days?: number;
}): WelcomeDecision {
  const cap = input.cap ?? WELCOME_CAP;
  const days = input.days ?? WELCOME_DAYS;
  if (input.existing) {
    return { action: 'existing', grant: input.existing };
  }
  if (input.granted >= cap) {
    return { action: 'sold-out' };
  }
  return {
    action: 'grant',
    grant: { number: input.granted + 1, startedAt: input.now, endsAt: input.now + days * DAY_MS },
  };
}

export async function readWelcomeGranted(): Promise<number> {
  const snap = await counterRef().get();
  const granted = snap.exists ? (snap.data()?.granted as unknown) : 0;
  return typeof granted === 'number' && granted >= 0 ? granted : 0;
}

export async function readWelcome(uid: string): Promise<WelcomeGrant | null> {
  const snap = await grantRef(uid).get();
  return snap.exists ? grantOf(snap.data()) : null;
}

export type ClaimWelcomeResult =
  | { status: 'granted' | 'existing'; grant: WelcomeGrant; remaining: number }
  | { status: 'sold-out'; remaining: 0 };

/**
 * Claim this reader's week, once. Idempotent: a second call returns the grant
 * they already have, so the app can call it on every sign-in without care.
 */
export async function claimWelcome(uid: string, now: number): Promise<ClaimWelcomeResult> {
  return db().runTransaction(async (tx: Transaction) => {
    const [mineSnap, counterSnap] = await Promise.all([tx.get(grantRef(uid)), tx.get(counterRef())]);
    const grantedRaw = counterSnap.exists ? (counterSnap.data()?.granted as unknown) : 0;
    const granted = typeof grantedRaw === 'number' && grantedRaw >= 0 ? grantedRaw : 0;

    const decision = decideWelcome({ existing: mineSnap.exists ? grantOf(mineSnap.data()) : null, granted, now });
    if (decision.action === 'sold-out') {
      return { status: 'sold-out' as const, remaining: 0 as const };
    }
    if (decision.action === 'existing') {
      return { status: 'existing' as const, grant: decision.grant, remaining: Math.max(WELCOME_CAP - granted, 0) };
    }
    tx.set(counterRef(), { granted: decision.grant.number }, { merge: true });
    tx.set(grantRef(uid), decision.grant);
    return {
      status: 'granted' as const,
      grant: decision.grant,
      remaining: Math.max(WELCOME_CAP - decision.grant.number, 0),
    };
  });
}

/** Account deletion removes the grant too — it is data held about the account. */
export async function deleteWelcome(uid: string): Promise<void> {
  await grantRef(uid).delete();
}
