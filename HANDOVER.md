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

The user is not familiar with Play Console and asked to be walked through it
one screen at a time, the way Firebase was done.

### Owed before upload

`docs/DATA-SAFETY.md` **must be rewritten once the backend ships.** Its answers
were written when the app talked to no server. Firebase Auth collects an email
and a Google identity, Firestore stores the keeper's name and date, and both
process IP addresses. Shipping a declaration that is no longer true is how
apps get pulled later.
