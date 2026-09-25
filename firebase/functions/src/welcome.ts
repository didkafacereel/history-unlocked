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

/**
 * Store review access.
 *
 * Google Play's reviewers must reach every paid part of the app, and they will
 * not buy anything, create an account, or accept a trial to do it. So the
 * account whose credentials go into Play Console → App access is given Pro by
 * the server, on the same document the launch gift uses — which is what the
 * app already reads as "Pro for a while, not bought".
 *
 * Deliberately NOT counted against the 5,000: the "N left" line is a promise to
 * readers, and a review account is not one of them. `number: 0` marks it.
 *
 * The list is a secret (REVIEW_EMAILS, comma-separated), not code: the repo is
 * public, and while an address alone opens nothing, there is no reason to
 * publish the one account that holds free Pro.
 */
export const REVIEW_DAYS = 400;

export function isReviewerEmail(email: string | null | undefined, list: string | null | undefined): boolean {
  if (!email || !list) return false;
  const wanted = email.trim().toLowerCase();
  return list
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(wanted);
}

/**
 * A reviewer keeps a grant that still has most of its length; anything shorter
 * — nothing yet, or the ordinary week from signing in before being listed — is
 * replaced by a fresh long one.
 */
export function decideReviewer(input: {
  existing: WelcomeGrant | null;
  now: number;
}): Exclude<WelcomeDecision, { action: 'sold-out' }> {
  const { existing, now } = input;
  if (existing && existing.number === 0 && existing.endsAt - now > (REVIEW_DAYS / 2) * DAY_MS) {
    return { action: 'existing', grant: existing };
  }
  return { action: 'grant', grant: { number: 0, startedAt: now, endsAt: now + REVIEW_DAYS * DAY_MS } };
}

export async function claimReviewer(uid: string, now: number): Promise<ClaimWelcomeResult> {
  const [existing, granted] = await Promise.all([readWelcome(uid), readWelcomeGranted()]);
  const decision = decideReviewer({ existing, now });
  if (decision.action === 'grant') {
    await grantRef(uid).set(decision.grant);
  }
  return {
    status: decision.action === 'grant' ? 'granted' : 'existing',
    grant: decision.grant,
    remaining: Math.max(WELCOME_CAP - granted, 0),
  };
}

/** Account deletion removes the grant too — it is data held about the account. */
export async function deleteWelcome(uid: string): Promise<void> {
  await grantRef(uid).delete();
}
