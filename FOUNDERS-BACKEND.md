# The founders backend

Everything the Lifetime tier needs that a phone cannot decide for itself: a
seat number that is unique across everyone, and a date that only one person can
hold.

`src/services/founders/` already has the shape — `remoteFoundersService.ts`
calls four endpoints and the app switches to it the moment
`EXPO_PUBLIC_FOUNDERS_API` is set. Until then `localFoundersService` runs, and
says out loud that its numbers are device-local.

---

## Decisions taken

| | |
| --- | --- |
| One keeper per date | 366 dates, 366 seats, ever |
| Claiming needs an account | **And so does buying Lifetime, since 22 September.** Subscriptions still do not. |
| Sign-in methods | Google **and** email magic link — no passwords |
| Wrong day | One-way in the app; `support@gridconvertpro.com` within 24 hours, by hand |
| Name appears | On the archive's daily rebuild, stated in the app |
| Platform | Firebase |

### Why Firebase over Supabase

Postgres would have given "one keeper per date" as a `UNIQUE` constraint, which
is the cleanest possible guarantee, and Supabase has magic links built in. It
lost on one operational fact: the free tier **pauses a project after a week
without traffic**, and a register of founders that stops answering because
nobody opened the app is not acceptable. Paying $25/month to avoid that is real
money before the first sale.

Firebase does not pause, the free quotas still apply under Blaze, and the app
is already a Google Play app with Google Sign-In configured. Firestore needs a
transaction where Postgres needed a constraint — more code, same guarantee.

---

## Shape

```
RevenueCat webhook ──> function ──> entitlements/{uid}  { lifetime: true }
                                          ├─> allocateSeat(uid)  { seat: n }
                                          │
claim a date ──> transaction ─────────────┤ rules read the entitlement
                                          └─> keepers/{MM-DD}  { uid, name, at }

refund ──> same webhook ──> lifetime:false ──> the day is released
```

### Why the webhook allocates the seat

It used to be the app's job: buy, then `POST /founders/seat`. That call raced
this webhook and usually lost — the server had not been told about the purchase
yet and answered 403 — the client swallowed it, and **no other code path ever
allocated a seat afterwards.** Somebody could pay and be permanently unable to
claim a day. The moment the server learns about the purchase is the right moment
to hand out the number; `allocateSeat` was already idempotent, so the client's
call still works and simply finds the seat there.

`GET /founders/me` now also returns `lifetime`, so the app can tell "not a
founder" from "a founder with no seat yet" and repair the second on every
launch, sign-in and restore. See `useFoundersStore.refresh`.

### What the webhook must NOT do

All three products grant the `pro` entitlement, so an event carrying `pro` says
nothing about which one it is about. The revoke branch used to fire on any of
them: a founder who also held a monthly subscription and turned off auto-renew
— the rational thing after buying Lifetime — had their seat destroyed and their
day put back on sale. The **product id** decides now, not `period_type`, and
`tests/foundersWebhook.test.ts` holds that scenario.

Refunds fall out of the same mechanism rather than needing their own. Without
it, someone buys, takes 29 February, refunds, and keeps the best day in the
calendar for nothing.

### Collections

| Path | Holds | Written by |
| --- | --- | --- |
| `entitlements/{uid}` | `lifetime`, `seat`, `updatedAt` | webhook only |
| `keepers/{MM-DD}` | `uid`, `name`, `claimedAt` | transaction, once |
| `counters/seats` | `taken` | transaction on seat allocation |

The document id **is** the date, which is what makes one-keeper-per-date
structural rather than a check someone can forget.

---

## What you do (I cannot)

### 1. Create the Firebase project

<https://console.firebase.google.com> → **Add project**. Name it whatever you
like; the project **ID** is what matters and I will need it.

Turn off Google Analytics unless you want it — it adds a consent surface to the
Play data-safety form we have already filled in.

### 2. Upgrade to Blaze

Entering card details is yours to do — I am not able to, and would not.

**Project settings** (gear, top left) → **Usage and billing** →
**Details & settings** → **Modify plan** → **Blaze, pay as you go** → create or
pick a Cloud Billing account → card.

### 3. Put a floor under it — this is the part people skip

Blaze is pay-as-you-go with **no ceiling by default**. For this app the real
cost is around zero, because the free quotas still apply under Blaze:

| | Free every month | What we will use |
| --- | --- | --- |
| Firestore reads | 50,000 / day | a few hundred |
| Firestore writes | 20,000 / day | one per claim, ever |
| Functions | 2,000,000 calls | one per purchase |
| Auth (Google + email) | unlimited | — |

The risk is not traffic, it is a mistake: a function that loops, or someone
hammering an endpoint.

**Budget alert** — Google Cloud Console → **Billing** → **Budgets & alerts** →
**Create budget** → amount **$5**, alerts at 50 / 90 / 100%.

Be clear about what that does: **it emails you, it does not stop anything.** A
budget is a smoke alarm, not a sprinkler. The things that actually cap us are
`maxInstances` on every function, which I set in code, and App Check, which I
will wire so only our app can call anything.

### 4. Register the Android app

In the Firebase project → **Add app** → Android.

- Package name: `com.historyunlocked.app`
- Download `google-services.json` and give it to me

### 5. The signing fingerprints — both of them

Google Sign-In refuses to work unless Firebase knows the certificate that
signed the app. There are **two**, and missing the second is the classic way
this breaks *after* launch rather than before it.

**Upload key** (what EAS signs with), in your terminal:

```bash
npx eas credentials -p android
```

Production → Keystore → copy the **SHA-1**.

**Play app signing key** (what users actually receive). Google re-signs the
bundle, so this is a different certificate: Play Console → your app →
**Test and release** → **Setup** → **App signing** → copy the SHA-1 there.

Add **both** in Firebase → Project settings → your Android app → **Add
fingerprint**. Installing from internal testing already uses the Play key, so
this is testable before release.

---

## What I do once I have the project id, `google-services.json` and the fingerprints

1. Firestore rules — nobody writes `entitlements`, a claim is allowed only
   against a live `lifetime`, a `keepers` document can never be overwritten
2. The four endpoints as callable functions, with `maxInstances`
3. The RevenueCat webhook, verified by a shared secret
4. Email magic link and Google sign-in behind the existing `AuthService`, so
   nothing above it changes
5. `EXPO_PUBLIC_FOUNDERS_API` into EAS, and a build that can actually sell
