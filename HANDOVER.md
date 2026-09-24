# Handover

Read this first. It is written so the next session can be started with the
word "continue" and nothing else.

**The commit messages are the real record.** They are written as decision
documents: what changed, what it cost, what was measured. `git log` answers
"why is this like this" better than any summary. This file is the map.

---

## 1. What this is

**History Unlocked** — an Expo / React Native "today in history" app, being
prepared for Google Play. 8,056 events across all 366 days, every backdrop a
freely licensed image of its own event, 6,017 written scenarios. Free is the
whole habit; Pro opens the depth; Lifetime buys a numbered founder seat and one
date of the year.

Repo `D:\android\history-unlocked`, public at
`github.com/didkafacereel/history-unlocked`. Archive served from GitHub Pages.

---

## 2. Standing directives

These came from the user across many sessions. They are not preferences to
re-confirm.

### How to work

- **Run the whole task without asking permission for mechanical steps.** Read,
  edit, run the gate, drive the browser. Report when it is done. Approving a
  lint run adds nothing and breaks their flow.
- **Ask only about decisions that are genuinely theirs** — product direction,
  pricing, scope forks where two readings mean materially different work.
- **Still confirm** before destructive or outward-facing actions.
- When they answer a fork with "as a specialist, which one" they want the
  recommendation **acted on**, not re-argued.
- They write in Bulgarian; the app is entirely in English.

### Architecture, non-negotiable

- Aggressive micro-component segmentation.
- Narrowest possible Zustand selectors — one field per subscription, for 60fps
  swipe.
- Manifest-first, Zod-gated at the ingestion boundary.
- TypeScript strict, `noUncheckedIndexedAccess`.
- Theme tokens only. No colour literals in components.
- **The overlay rule:** every sheet renders as a SIBLING of `FeedDeck`, never
  inside it, with open state in a store. Small pressables inside the deck are
  fine with `pointerEvents="box-none"`.
- Platform splits are `index.ts` (web) / `index.native.ts` (native), and the
  trap is that `./index` resolves to `index.native.ts` on native — a module
  importing itself. `tests/platformSplit.test.ts` guards it.
- Benchmarks: TikTok, Blinkist, Duolingo.

### Content, non-negotiable

- **Rule 6: every image depicts its own event.** No decorative stand-ins.
- **Never remove `imageCredit`, `imageSourceUrl` or `textCredit`.** They are
  the licence terms. Only free licences ship.
- Nothing is advertised that a buyer cannot find, and nothing is withheld that
  they do get — `src/config/pro.ts` carries the rule and the store listing
  follows it.

### Secrets

- Secrets go through the environment, never chat, never committed.
- The user's personal address is never hardcoded as a destination. The public
  support address `support@gridconvertpro.com` is different and is published
  deliberately.
- Never ask for their GitHub token.
- Claude never enters card or payment details. Those steps are written out for
  the user to perform.

### The verification gate — run all of it before saying done

```bash
npm run typecheck      # both tsconfigs
npm run lint
npm test               # 154 tests
npm run validate:manifest
```

Plus the browser preview at 360×800, which is the tightest common phone. **The
web preview is not evidence for anything native** — that lesson cost a day.

---

## 3. What has been asked for, and where it stands

Everything below was requested by the user. Ordered roughly as it came.

| # | Asked for | State |
| --- | --- | --- |
| 1 | Pre-upload review, then fix everything it found | done |
| 2 | Flag / anachronism curation | done to the point of diminishing returns; 415 symbol backdrops left, needs human curation |
| 3 | Split quiz pools out of the manifest | done — first download 5.73 → 4.06 MB |
| 4 | Device build, then fix what the phone showed | done — paywall truncation, top-bar overlap, title truncation |
| 5 | A launch screen instead of a black screen | done — brand, date line, four tiles |
| 6 | GitHub repo and hosting | done — Pages live |
| 7 | An accounts file | done — `ACCOUNTS.local.md`, gitignored |
| 8 | Make the quiz discoverable | done — butterfly in the progress rail, and a tile |
| 9 | Image tiles to choose a section | done — four commissioned images |
| 10 | A "become Pro" tile | done, and later raised above the fold |
| 11 | Today's date + who keeps it | done — `LaunchDateLine` |
| 12 | Collage of real events, not a generated one | done — `pipeline:collage`, 28 public-domain prints |
| 13 | Contact email | done — `support@gridconvertpro.com` |
| 14 | "claim it" should go straight to the purchase | done — `?plan=lifetime`, and `/keep-a-day` for founders |
| 15 | A proper menu bar with a back button | done — scrim, back to hub, no more overlap |
| 16 | More than 3 quiz questions a day | done — 8 free, 16 Pro, XP rescaled |
| 17 | Why only 372 seats — aren't there 366 days | done — seats tied to the calendar, 366 ever |
| 18 | One keeper per date, not three | done |
| 19 | A calendar of who owns which date | done — `/keepers`, open to all, names to founders |
| 20 | "Supported by gridconvertpro.com" | done — foot of the launch screen |
| 21 | Lifetime, 100% — tell me what it needs | in progress — backend written, not deployed |
| 22 | Email sign-in as well as Google | done — magic link; needs SHA-256 to work on device |
| 23 | Filter the keeper name, English only | done — Latin-only, server-enforced word list |
| 24 | Fix text unreadable on white photographs | done — scrim remeasured against a forced-white card |
| 25 | Free should reach back a week in the calendar | done — 7 days, 3 events each, backwards only |
| 26 | Daily notification | already existed; horizon raised 10 → 30 days |
| 27 | Account deletion | done — **not asked for; found while rewriting the data-safety answers.** Play requires it of any app that creates accounts, and this one does. See below. |
| 28 | Hostile pre-release review | phases 0–7 run. Six findings, all fixed. The prompt is reusable; ask the user for it. See below. |
| 29 | Sign-in before a Lifetime purchase | done — the user's call, taken as a specialist recommendation. Subscriptions unchanged. |

### What the review found, and why it mattered

Every finding was in code that had never run against a real Firestore or a real
RevenueCat key, and all four converged on one state: **paid, no seat, no way
back.**

1. **The seat allocation raced the webhook and usually lost.** `claimSeat` was
   called from exactly one place, immediately after paying, against a server
   that had not been told about the purchase yet. It answered 403, the client
   swallowed it silently, and no other path ever allocated a seat — `restore`
   refreshed but never claimed, and so did launch. Fixed twice over: the
   webhook allocates the seat itself, and `refresh` repairs a founder with no
   seat on every launch, sign-in and restore.
2. **Cancelling a monthly subscription destroyed a founder seat.** All three
   products grant `pro`, and the revoke branch checked only that. A founder who
   also subscribed and then turned off auto-renew — the rational thing to do
   after buying Lifetime — lost their seat and had their day put back on sale,
   instantly, while the subscription was still running. The product id decides
   now.
3. **TRANSFER was ignored**, and it is the designed purchase path: buying
   needed no account, so the purchase landed on an anonymous id and moved to
   the Firebase uid at sign-in. The money stayed on an id nobody can sign in
   as. Handled now — and Lifetime requires a signed-in buyer, so it should not
   arise.
4. **The just-paid founder was shown an advertisement for what they had just
   bought.** `seat === null` meant both "not a founder" and "we do not know
   yet". `FounderStatus.lifetime` separates them.

`tests/foundersWebhook.test.ts` is the decision table, 17 cases. It would have
caught (2) in a minute.

Two more, from the later phases:

5. **A release build with billing but no `EXPO_PUBLIC_FOUNDERS_API` would have
   sold $79.99 seats out of AsyncStorage.** Exactly the hazard
   `src/services/purchases/index.native.ts` was hardened against, one product
   along, and it had never been closed here. `lifetimeIsSellable()` now drops
   the product from the offering and hides both pitches when no endpoint is
   configured.
6. **The chip could still be left with an orphaned opener.** "1919 and 1920
   battles in the Polish–Soviet War" went onto the card as "and 1920 battles…"
   — same family as the "1864–" regression, opposite end of the string. Found
   by sweeping all 8,056 events rather than by example, which is how the rest
   of this should be checked too.

### What the review cleared

The date engine, which was the thing most likely to be wrong: `todayDateKey`
reads the local calendar, `dateKey` is not persisted so "today" cannot freeze,
and the resume listener moves a reader forward without dragging someone out of
the Time Machine. No Cyrillic anywhere in `src/`. DEV buttons are behind
`__DEV__`. `app.json` and `eas.json` are release-shaped and `expo.name` is
still "History Unlocked". Chip sanitiser: 0 echoed years and 0 dangling ends
across the whole archive. Every image and source URL is https, and
`validate:manifest` now fails if that stops being true.

### A finding that was downgraded, honestly

The missing `.catch` on `/e/[id]` was first called S1 — "spinner forever,
offline". It is not. Every layer under `resolveManifest` catches and returns
null; the only throw is the bundled fixture failing its own schema, which
`validate:manifest` gates on every build. The guard is still right, and it is
latent S3, not a blocker.

### Open questions the user has not answered

- **When to ask for notification permission.** Recommended: after the first
  finished quiz, when they have just shown interest. Currently opt-in and
  buried in the profile, so almost nobody will find it.
- **Emoji on the launch tiles** — they said keep them. Settled.

---

## 4. What happens next, in order

The full detail is in the memory note `history-unlocked-launch-todo` and in
`FOUNDERS-BACKEND.md`. Short version:

1. **Upload the `.aab` to Play Internal testing.** Everything is blocked on
   this, and a new personal developer account must run a 12-tester closed test
   for 14 continuous days before production. The clock has not started. The
   file is at `~/Downloads/HistoryUnlocked-v1.0.0-build3.aab` — it predates
   21–22 September, which is fine for establishing the track and getting the
   app-signing key, wrong for testing.
2. **Both signing fingerprints into Firebase.** SHA-1 from `npx eas
   credentials -p android`, SHA-256 from Play Console → App signing. Until
   both are in, neither sign-in method works on device.
3. **Three products** — `store/BILLING-SETUP.md`.
4. **RevenueCat**, then `EXPO_PUBLIC_RC_ANDROID_KEY` into EAS, then deploy the
   functions.
5. **A fresh build** — the first one that can actually sell anything.
6. **Screenshots** from the installed build — five listed in
   `store/LISTING.md`.

### After launch — the update roadmap

Agreed with the user on 23 September: every growth idea is wanted, and all of
them ship as updates AFTER launch. Nothing below is started before 1.0 is live
and there are 30 days of real data. The order is by what each one does:
reach first, then market size, then revenue per reader, then retention.

| Version | What | Why this position |
| --- | --- | --- |
| — | **Short video**, daily, from the archive | Not an app update at all — content operations. Can start on day one of the closed test. The cheapest route to the first 100k readers, and the pipeline already produces the material. |
| 1.1 | Closed-test fixes; the notification prompt after the first finished quiz (the open question in §3); decide on minimal privacy-respecting analytics | Without measurement nothing after this can be judged. Analytics changes the Data safety answers. |
| 1.2 | **Languages**, Bulgarian first | The biggest multiplier. Needs i18n in the app (every UI string is hard-coded English today) and a pipeline run per Wikipedia language. Each language gets its own 366-day register. |
| 1.3 | **Gift a day** | Emotional, proven category, and it makes the register spread. Needs a gift-code flow: buyer pays, recipient claims. Care needed for memorial days. |
| 1.4 | **Audio briefings** | Daily three minutes. Already on the deferred list. |
| 2.0 | **Schools** | Class mode, teacher dashboard, per-school licence. Slow to sell, sticky, higher revenue per seat. |
| 2.x | AI historian over the archive; "what happened here" from event coordinates | Differentiators, once the base is growing. Watch cost per reader. |

**Income, agreed 24 September — all of it, no ads.** The user is building this
for passive income and chose every option offered except advertising, which
they had never considered:

| Stream | Kind | Notes |
| --- | --- | --- |
| 7-day store trial on annual + per-country prices | configuration only | Done when the products are created in Play Console. RevenueCat Experiments can test prices. |
| **First 5,000 readers: a free week of Pro, no card** | launch hook | The user's own idea, 24 Sep. Server-side counter (same transaction pattern as seats), RevenueCat promotional entitlement granted by the backend, live "N of 5,000 left" line, a day-6 reminder. Needs RevenueCat to exist. **Guard the webhook against promotional events before it ships** — a promo arriving as NON_RENEWING_PURCHASE without a product id would currently read as Lifetime. |
| "Your birthday in history" | one-off purchase, gift | Generated from the archive; later print-on-demand posters. Not a founder seat — no scarcity consumed. |
| **Short video** | distribution + platform revenue | **FIRST, by the user's choice**: they already run a history TikTok channel. Public-domain images only in video (CC BY-SA share-alike risk). |
| Daily newsletter | distribution + sponsorship | Sent from the archive; ad networks sell the space. |
| Languages | multiplier | Each language: a new market, a new 366-seat register, new video and newsletter. |
| Teacher packs | passive digital sales | Built from the 6,017 authored scenarios — the only content that is wholly ours; the rest is Wikipedia and copyable. |

**Nothing being launched now blocks any of this.** The register is keyed by
`MM-DD` alone; when languages arrive, today's collections simply become the
English register and new languages get their own. No migration of anything a
founder has bought.

**Decision gate after 30 days:** if D30 retention is healthy, go to languages;
if not, fix the daily habit before adding anything.

### Firebase is live — 24 September

Deployed to `history-unlocked-fa9a9`, europe-west1:

- functions `api` and `revenuecat` at
  `https://europe-west1-history-unlocked-fa9a9.cloudfunctions.net/{api,revenuecat}`;
  smoke-tested live (anonymous calendar 200, unsigned calls 401, webhook with
  no or wrong secret 401)
- `REVENUECAT_WEBHOOK_SECRET` in Secret Manager — generated on this machine,
  never printed or written anywhere else. Read it back only in your own
  terminal when pasting into RevenueCat: `npm run secret:webhook:show` in
  `firebase/functions`
- Firestore rules: **no client access to anything but your own entitlement**.
  keepers/registry/counters were public-read and every keeper document
  carries the founder's uid; the app never reads Firestore directly, so they
  were closed before the first deploy. Direct read verified 403
- Hosting: a minimal site whose only job is `/.well-known/assetlinks.json`,
  so the email sign-in link opens the app. Hosting had never been deployed,
  so the file did not exist and the link would have opened a browser tab.
  Confirmed by Google's own Digital Asset Links verifier
- artifact cleanup policy, 3 days, so old images do not accrue a bill
- EAS: all six `EXPO_PUBLIC_FIREBASE_*` / `GOOGLE_WEB_CLIENT_ID` /
  `FOUNDERS_API` in production, preview and development. Local development
  reads the same from `.env.local` (not committed)

**⚠ When the app is first uploaded to Play:** Play re-signs it with its own key.
That key's SHA-256 must go in TWO places, or sign-in works from a sideloaded
build and fails for every store install:
1. Firebase → Project settings → the Android app → Add fingerprint (SHA-1 and
   SHA-256 of the **app signing** key, from Play Console → App integrity)
2. `firebase/hosting/.well-known/assetlinks.json` → add it to
   `sha256_cert_fingerprints`, then `firebase deploy --only hosting`

Two things now have to be true in the Console before the app can publish, and
both are ready in the repo: the privacy policy URL, and the **account deletion
URL**. Both are listed in `docs/DATA-SAFETY.md` with the fields they go in.

The user is not familiar with Play Console and asked to be walked through it
one screen at a time, the way Firebase was done.

### Owed before upload

`docs/DATA-SAFETY.md` — **done, 22 September.** Rewritten against the shipped
backend: accounts, the published keeper name, the RevenueCat webhook, and a
note on why IP addresses have no line in the form. `docs/privacy.html` was
rewritten in the same pass, because it was published and no longer true — it
knew about Google sign-in but not the email link, the public register or
Firestore.

**Account deletion — found in that pass, and it was a blocker.** Google Play
requires any app that lets people create an account to let them delete it, from
inside the app *and* from a web page someone who has uninstalled can reach. A
support mailbox does not satisfy it. History Unlocked creates an account the
moment anyone signs in, and had no deletion path at all.

Now it has one: `DELETE /account` on the founders API releases the kept date,
removes the entitlement and deletes the Firebase Auth user; the profile has a
two-step confirm; `docs/delete-account.html` is the public page. **The Console
wants that URL in two separate fields** — App content → Data deletion, and the
Data safety form — and `docs/DATA-SAFETY.md` says which.

A founder who deletes loses their seat and their day for good, and the confirm
says so in those words. That was a judgement call: Play does not allow
deletion to be blocked, so the only honest alternative to letting them was
refusing to ship the tier.
