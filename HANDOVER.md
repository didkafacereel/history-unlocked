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
| 28 | Hostile pre-release review | in progress — phases 0, 1, 2 and the money path done; 3, 5, 6, 7 outstanding. The prompt is reusable; ask the user for it. Four findings, all in the money path, all fixed — see below. |
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
