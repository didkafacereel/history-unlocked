---
name: history-unlocked-dev
description: >-
  Conventions, architecture rules, and hard-won gotchas for the "History Unlocked"
  Expo app (the codebase rooted at D:\android\history-unlocked). Use this skill
  whenever working on History Unlocked — any task touching the Chronos feed, the
  Tactical overlay, the Butterfly Effect quiz, gamification/Intel Ranks, the
  Pro/paywall/entitlement layer, the Time Machine calendar, or the content/image
  pipeline, and before creating or editing any file under `src/` or `pipeline/`.
  Consult it first so you follow the project's component-segmentation, narrow
  Zustand-selector, token-theming, and Zod-manifest rules, run the right
  verification gate, and avoid the known Reanimated 4 / RN 0.85 / expo-router
  pitfalls that have already bitten this codebase.
---

# History Unlocked — codebase guide

"History Unlocked" is an S-tier "Today in History" mobile app: a TikTok-style
swipeable feed, Blinkist-grade density, a scenario-based daily quiz, and
Duolingo-style gamification. Stack: **Expo SDK 57, React Native 0.86, Reanimated
4.5 (+ react-native-worklets 0.10), gesture-handler 2.32, expo-router (routes
live in `src/app`), Zustand 5, Zod 4, expo-image, AsyncStorage, RevenueCat,
Firebase Auth (JS SDK), expo-updates**. TypeScript strict +
`noUncheckedIndexedAccess`. React Compiler is enabled.

**Upgraded 56 → 57 on 24 September 2026**, deliberately, before launch: SDK
56's Hermes V1 has a known memory regression in apps importing Reanimated or
worklets (the feed's swipe), fixed only in expo@57.0.9+; 57.0.17+ also fixes a
startup-time regression. `npx expo-doctor` checks for it — keep it at 21/21.

`AGENTS.md` at the repo root says it plainly: **Expo has changed — read the
versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing Expo
code.** Don't assume older-SDK APIs.

## Where the project stands

Built and verified: the Chronos feed, Tactical overlay, Butterfly Effect quiz,
gamification (XP / Intel Ranks / streak), and the monetization waves —
**Wave 0** (entitlement layer: `PurchaseService` abstraction, RevenueCat behind a
platform split, paywall) and **Wave 1** (Pro unlocks: Time Machine calendar,
tactical-on-all, unlimited quiz/practice, streak shields).

**Wave 2 is done.** The archive holds **8056 events across all 366 days** (22 a day, plus a register of 9 people on every date — portraits and short biographies, 3294 people, 95% with a free-licensed image), every
one with real archival imagery (rule 6 is satisfied — no placeholders remain),
plus the read-more sheet and share cards.

**Wave 3 is done except audio.** Three retention features shipped together,
all aimed at the same question — why a reader should still be here in year two,
when the calendar comes round again:

- **The reading library** (`useLibraryStore` + `src/data/deckPlan.ts`). Every
  card read is remembered, the feed opens on the reader's first UNREAD event,
  and unread cards carry a NEW badge. Free readers get `FREE_DEPTH` (3) events
  per day and a `DepthLockCard` naming how many more the day holds; Pro gets all
  ~10. Read-state never reorders anything — only the entry point moves.
- **The lead** (`planDeck` → `heroId`). The day's strongest event is PINNED at
  index 0 and carries `CardLeadBadge` plus the `heroHeadline` type scale; the
  rest follow in year order. Sorting strictly by year buried the strongest event
  past card three on **80% of days** (average position: 6th of 10), so a reader
  who swiped twice and left had missed the best thing on the date. Free decks
  are led by the same event, because the lead is rank 0 of the prominence sort.
  When the LLM pass eventually runs, the lead is where an authored ~200-word
  brief goes, and THAT becomes the second Pro axis — today only 28 of 366 days
  have prose long enough for one, so it is not promised yet.
- **Quizzes on every date** (`src/data/quizGeneration.ts`). Only 5 events in the
  archive carry an authored scenario, so recall questions are generated from the
  manifest for the rest — 7,635 questions, every day covered. They are labelled
  "Recall Check" / "What happened", never dressed up as authored scenarios.
  `useRecallStore` schedules each answered event on a 1/3/7/16/35/75-day ladder;
  the Pro `/recall` drill reviews whatever is due, across the whole archive.
- **The Museum** (`src/config/collections.ts`, `/collections`). 14 themed sets;
  a read event reveals its card, an unread one shows only its year and the date
  to find it on.

Remaining: **Audio Briefings** (OpenAI TTS — provider chosen, nothing built),
authored scenarios for more dates (`pipeline/build-day.ts`, needs API credits),
prestige ranks, and **Wave 4** (i18n, leaderboards, offline).

Also shipped: **cornerstones** (`pipeline/cornerstones.ts`, checked by
`npm run pipeline:cornerstones`). ~70 events the app forces into their date
because the feed does not guarantee them — its 7 December list has no Pearl
Harbor at all. They carry `cornerstone: true` and `deckPlan` scores that above
everything, so the date opens on the event it is known for.

**OVERLAY RULE (a bug was shipped by breaking it):** every sheet must render as a
SIBLING of `FeedDeck` in `ChronosFeedScreen`, next to `TacticalOverlay` and
`EventDetailSheet` — never inside the deck, and never holding its open/closed
flag in local state of a component that lives there. The category filter was
built inside `FeedDateBar` (which is a child of the deck's `GestureDetector`) and
vanished moments after opening: touches on it fed the deck's pan gesture, and the
deck remounts on every `cardHeight` change (it is keyed on it), taking the local
`filterOpen` with it. Fixed by `useFilterSheetStore` + rendering the sheet beside
the other overlays. A new sheet gets a store, like `useOverlayStore` and
`useEventDetailStore` already do.

**Two pipeline bugs this uncovered, both now fixed — do not reintroduce them:**
1. Event ids were `evt-{year}-{article}` with **no date**. Most wartime feed
   entries link to the same hub article, so 6 June 1944 and 2 January 1944 both
   produced `evt-1944-world-war-ii`; the database is one map keyed by id and a
   run walks January first, so January silently owned the year's most famous
   events. No D-Day, no Hiroshima. Ids now include the dateKey.
2. `fetchDayCandidates` broke ties by **year ascending**, so taking the top N
   meant taking the N oldest and cutting every modern entry — 11 September
   stopped at 1897 with the 2001 attacks unused at rank 17. It now preserves the
   feed's own order (stable sort), which is Wikimedia's editorial ranking.

Also shipped: **the register** (`pipeline/people.ts` → `pipeline/people-db.json`
→ merged into the manifest by `publish-manifest.ts` → `RegisterCard`, a terminal
feed card free for everyone). Births, deaths and observances, from the same
"on this day" feed that was already being fetched — ~220 births and ~110 deaths
per date the app previously threw away. **Ranked by Wikidata sitelink count**,
never by article length: length ranks a geographer above Leonhard Euler, and
`prop=langlinks` cannot be used because its 500-item cap is spent across the
whole batch, silently zeroing everyone after the first few titles.

Also shipped: **`sensitivity`** on every event (`standard` | `solemn`, derived
by keyword in `pipeline/lite.ts`, re-derivable offline via `pipeline:reclassify`;
121 of 3820 are solemn). It changes NOTHING about what is shown — it only
silences the app's celebration and collecting language where a progress bar over
the material would be indecent: no confetti on a quiz round that touched a
massacre, and the disaster collection ("Days of Loss") reads "read" instead of
"collected" and never turns green. **Rule: any new celebratory affordance must
check it.** And **`/e/[id]`** — the standalone landing page a shared link opens,
resolved by id straight from the manifest with no deck loaded.

Also shipped: **category filter** (Pro, `planDeck({category})` + `CategoryFilterSheet`
off the feed's date bar — the chip only appears once a day carries 6+ events),
**archive search** (Pro, `src/data/search.ts` — a lazily built in-memory index,
AND across terms, title hits weighted 10× body hits), and the **daily reminder**
(`src/services/notifications/` platform-split + `useReminderStore`). Each day is
scheduled as its OWN dated notification carrying that day's real lead headline,
not one repeating trigger with generic copy — so the horizon is finite and
`_layout` tops it up on every launch. One a day, free for everyone: gating the
habit engine would be charging for the habit. **Cannot be verified on web** —
`expo-notifications` does not schedule there and the panel says so.

Also shipped: **the suggestion button** (`src/config/feedback.ts` +
`SuggestEventButton`, at the close of the register card). Backendless on
purpose — it opens a prefilled composer and becomes a real endpoint the day one
exists, by setting `EXPO_PUBLIC_FEEDBACK_FORM_URL`. With neither that nor
`EXPO_PUBLIC_FEEDBACK_EMAIL` set the button does not render, rather than opening
a composer addressed to nobody. The message carries a digest of what the date
ALREADY holds, so a report can be judged without a lookup. **Never hardcode a
destination address** — it is configuration, not code.

Also shipped: **founders** (`src/services/founders/`, `useFoundersStore`).
Lifetime sells in three GENERATIONS (`FOUNDER_GENERATIONS`: 500 seats each at
$79.99 / $119.99 / $159.99, 1500 total). The generation is DERIVED from the
seat number, never stored, so it cannot disagree with it. A purchase allocates a
numbered seat and
grants one calendar date, kept in the buyer's name at the foot of that day's
register (`KeptByLine`), up to `KEEPERS_PER_DATE` (3) names per date. Both are
GLOBAL facts, so the service is an interface with a device-local stand-in and a
remote implementation behind `EXPO_PUBLIC_FOUNDERS_API` — the same shape
`PurchaseService` uses. **Nothing about founder standing is persisted on the
device**: a cached seat would outlive a refund. Two rules that must hold: the
seat cap is REAL (raising it later costs more than the seats earn), and while
the local provider runs the badge says "provisional" out loud.

Also shipped: **readers' choice voting** (`src/services/voting/`, `useVoteStore`,
`ReadersChoiceCard`). A Pro-only ballot listing the whole day — not a vote
button per card, which would measure position rather than preference. Counts are
hidden until you vote, and no tally is shown below `VOTE_THRESHOLD` (10). The
result is BAKED into the manifest at publish (`readersChoice`, `voteShare`), so
the app never reads a live count to draw a card: the feed stays static, offline
and immune to the voting service being down. `prominence` gives it **+8** —
enough to lead an ordinary day, 92 points short of a cornerstone, so no number of
votes moves the attacks off 11 September. Verified both cases.

Also shipped: **Google sign-in** (`src/services/auth/`, platform-split like
billing; `useAuthStore`; `AccountPanel` in the profile). Optional by design — a
free reader never sees a prompt and the copy tells them they don't need one.
It exists for the three things that cannot survive a reinstall otherwise: the
founder seat, the kept day, and one-vote-per-person. Signing in calls
`PurchaseService.logIn(userId)`, which is what makes entitlement follow the
person rather than the handset. **Google only, and that is an iOS launch
blocker**: Apple requires Sign in with Apple alongside any other social login on
iOS, so an iOS build must add it or be rejected. Needs
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (the WEB client id, even on Android — the
Android one causes DEVELOPER_ERROR) and a dev build; web and credential-less
builds run a stand-in that labels itself.

Known wart: `monthLabel` / `shortDateKeyLabel` use the DEVICE locale, so month
names render in the user's language inside otherwise-English copy. Consistent
across calendar and quiz — fix it as part of i18n, not piecemeal.

Not built, in rough priority: **audio briefings** (OpenAI TTS, chosen, the only
feature with a real recurring cost — think hard before promising it to lifetime
buyers), **a daily local notification** (expo-notifications; the habit engine is
entirely absent and cannot be verified on web), **a home-screen widget** (needs
`react-native-android-widget` + a dev build; impossible in Expo Go or web),
**onboarding**, **analytics** (nothing is instrumented, so no retention claim is
currently measurable), and authored scenarios for more dates (needs API credits).

## Non-negotiable architecture rules

These are the project's founding constraints. Honor them or the design erodes.

1. **Aggressive micro-component segmentation.** No monolithic files. Each UI
   concern is its own small, memoized, reusable component. Features own their
   components under `src/components/<feature>/`; cross-feature atoms live in
   `src/components/primitives/`. A new "card" or "panel" is several files, not one.

2. **Narrow Zustand selectors — never subscribe to a whole store.** Always
   `useFeedStore((s) => s.activeIndex)`, never `useFeedStore()`. This is what
   keeps the 60fps swipe re-render-free: the streak flame, quiz dots, and rank
   badge each re-render only when their exact datum changes. Stores are split one
   per concern (`useFeedStore`, `useQuizStore`, `useProgressionStore`,
   `useOverlayStore`, `useEntitlementStore`) so an update in one can't invalidate
   another. Each store file documents this contract at the top — keep it true.

3. **The gesture never touches React state.** The Chronos swipe lives entirely on
   the UI thread as Reanimated shared values. The single JS hop is
   `scheduleOnRN(onSettle, …)` (from `react-native-worklets`) AFTER the settle
   spring finishes — that's the only moment the store updates. Don't read/write
   React state mid-gesture.

4. **Manifest-first data, Zod-gated at the boundary.** `src/types/manifest.ts`
   (compile-time) mirrors `src/data/manifest/schema.ts` (runtime Zod) 1:1 — change
   them together. All ingested data passes the schema at the boundary
   (`src/data/ingestion.ts`); a malformed remote manifest is survived (warn +
   fall back), a malformed bundled fixture throws loudly. Never parse manifest
   data ad hoc in a component.

5. **Theme tokens only — no literals.** Colors/spacing/radius from
   `src/theme/tokens.ts`, type from `src/theme/typography.ts`, and every spring
   from `src/theme/motion.ts`. One kinetic vocabulary across the app; don't inline
   a spring config or a hex value.

6. **Every image must depict its own event — this is a product-defining rule.**
   The backdrop is the first thing a user sees and it is the whole reason the feed
   feels premium. A random stock photo (the old `picsum.photos` placeholders put a
   MacBook behind Tudor England) instantly makes the app look cheap and breaks
   trust in the history itself. So: an event's `imageUrl` must point at an image
   generated from *that event's* prompt (`pipeline/prompt.ts` builds it from the
   title, region, year, and era). Never ship, seed, or "temporarily" fall back to
   generic/random imagery — if generation is unavailable, leave the previous
   event-specific image in place or fail loudly, and say so. Treat a mismatched
   backdrop as a bug of the same severity as a crash.

## Directory map

```
src/app/                routes ONLY (expo-router). _layout, index (feed),
                        quiz, profile, paywall, calendar. No feature logic here.
src/components/
  chronos-feed/         the swipeable feed: ChronosFeedScreen, HistoryCardViewer,
                        Card* micro-components, FeedDateBar, useSwipeGesture
  tactical-overlay/     custom Reanimated bottom sheet + sections
  quiz-engine/          QuizEngine state-machine host + ScenarioPrompt, ChoiceGrid…
  gamification/         StreakFlame, IntelRankBadge, RankProgressBar, ProStatusPanel…
  calendar/             Time Machine grid (CalendarMonthGrid, CalendarDayCell)
  collections/          the Museum: CollectionCard, CollectionSheet, CollectionEntryRow
  event-detail/         read-more sheet (EventDetailSheet, DetailFactRow)
  share/                9:16 story-card export (ShareCard, useShareEvent)
  paywall/              PackageCard, PaywallFeatureRow
  primitives/           GlassPanel, PressableScale, SegmentedText, ProGate
src/stores/             one Zustand store per concern (see rule 2)
src/data/               ingestion.ts, prefetch.ts, deckPlan.ts, quizGeneration.ts,
                        collections.ts, manifest/ (schema.ts + fixture)
src/services/purchases/ billing abstraction (PurchaseService + dev/RevenueCat)
src/theme/              tokens, typography, motion
src/lib/                dateKey helpers
src/hooks/              useHaptics, useTodayDeck…
pipeline/               content + image generators (Node, run with tsx)
```

## Hard-won gotchas (these have already broken the build)

- **Reanimated 4 spring config** uses `energyThreshold`. The v3 fields
  `restDisplacementThreshold` / `restSpeedThreshold` do **not** exist and will
  fail typecheck.
- **`react-hooks/immutability` lint rule** forbids mutating a shared value that
  appears in any `useEffect` dependency array. For mount animations use a
  declarative `entering={…}` (e.g. `SlideInDown.springify()`, `FadeInDown`,
  `Keyframe`) instead of writing the shared value in an effect.
- **RN 0.85 removed `StyleSheet.absoluteFillObject`** from the types. Use
  `StyleSheet.absoluteFill` (array style) or spell out
  `position:'absolute', top/left/right/bottom:0`.
- **Adding an expo-router route requires the dev server to regenerate
  `.expo/types` before `tsc` passes.** `router.push('/newroute')` will fail
  typecheck until typegen runs — and `expo export` does NOT trigger it. Start the
  dev server (or the preview server) once after adding a route, then typecheck.
- **Native-only dependencies must be platform-split** so they never enter the web
  bundle. Pattern: `index.ts` (base → web + typecheck, no native import) vs
  `index.native.ts` (imports the native module). See `src/services/purchases/`
  for RevenueCat done this way. A `*.native.ts` file is only bundled on
  native; the web preview stays clean.
- **React Compiler is on**, but we still wrap feed/list components in
  `React.memo` and pass primitive/stable props — explicit memoization on the hot
  path, belt-and-suspenders with the compiler.

## State stores

| Store | Owns |
| --- | --- |
| `useFeedStore` | deck, activeIndex, dateKey, lockedCount, unseenIds, heroId, register, deckToken; `loadDeck(dateKey, strict?)` |
| `useQuizStore` | quiz state machine idle→question→reveal→summary; `items` are `{eventId, question}` pairs, NOT bare questions |
| `useProgressionStore` | XP, streak, history — persisted via AsyncStorage; rank is DERIVED from XP in `src/types/progression.ts`, never stored |
| `useOverlayStore` | tactical sheet payload (open/close only) |
| `useEntitlementStore` | Pro `isPro` (persisted) — use the `useIsPro()` selector for gating |
| `useLibraryStore` | which events have been READ (persisted `seen`: id → epoch-day). `whenLibraryReady()` must be awaited before planning a deck — AsyncStorage hydration is async |
| `useRecallStore` | spaced-repetition schedule (persisted): id → { due, streak, lapses }. Graded on every answer |
| `useEventDetailStore` | which event's read-more sheet is open |

## Data layer & Time Machine

`ingestion.ts` resolves a manifest remote-first → AsyncStorage cache → bundled
fixture, all Zod-gated. The served manifest is the **full archive** (all dates);
the app filters by `dateKey` client-side, so the Time Machine loads any day
offline from one cached manifest. `loadDailyDeck(dateKey, { allowFallbackToAll })`:
today's load falls back to the full set when sparse; calendar picks are strict
(empty deck → `FeedEmptyState`). Date model is `MM-DD` ("this day across years").

`loadDailyDeck` returns the day; **`planDeck` decides what is rendered** — the
free depth wall and the unread-first entry point both live there, and nowhere
else. `loadDeck` short-circuits when the same day is already loaded at the same
entitlement: re-planning a day the reader is on would advance them past the card
in front of them, because the landing card is marked read on load.

Two feed rules that already cost an afternoon:

- **The card height is MEASURED (`onLayout`), not taken from
  `useWindowDimensions`** — that hook reports 0 in an embedded/hidden web pane,
  and a zero card height stacks every slot on one offset, so the reader sees
  card one while the store thinks they are on card three (and React logs
  `NaN` opacity warnings).
- **Re-anchoring the deck means REMOUNTING it.** `scrollY` is a UI-thread shared
  value React must not write (`react-hooks/immutability`), so `FeedDeck` is
  keyed on `cardHeight` and the route keys `ChronosFeedScreen` on `deckToken`.

Beyond one day: `loadAllEvents()` (the Museum) and `loadEventsByIds()` (the
recall drill, whose due events are spread across the archive).

## Pro / entitlement

Gate with `<ProGate>` / `useIsPro()`. Everything billing goes through the
`PurchaseService` interface — never import `react-native-purchases` directly. With
no `EXPO_PUBLIC_RC_IOS_KEY` / `EXPO_PUBLIC_RC_ANDROID_KEY`, the dev provider runs
(works on web; profile has a `__DEV__` Pro toggle). RevenueCat entitlement id is
`pro`, offering `default`. RevenueCat needs a dev build — it won't run in Expo Go
or on web.

## Content & image pipeline (`pipeline/`)

- `npm run pipeline:events` — LLM event generator (Claude API, `claude-opus-4-8`,
  adaptive thinking, structured outputs + strict Zod re-validation). Drafts to
  `pipeline/drafts/`; `-- --merge` folds into `events-db.json`. Needs
  `ANTHROPIC_API_KEY`.
- `npm run pipeline:people -- --date MM-DD [--days N] [--dry]` — the register
  (births/deaths/observances) into `pipeline/people-db.json`. Kept in a separate
  file from the events DB **on purpose**: the two passes have different costs and
  a long events rebuild must never be able to clobber a register run's writes.
- `npm run pipeline:lite -- --date MM-DD [--days N] [--no-fixture]` — **the free
  content path, and how the archive gets filled.** `DEFAULT_COUNT` is 22 events
  per day; `count + RESOLVE_HEADROOM` must stay under **50**, the per-request
  title limit on both Wikimedia endpoints — that ceiling is why 22 events a day
  costs exactly the same two API calls as 10 did. Pulls verified entries from
  Wikimedia's "on this day" feed (`pipeline/onthisday.ts`), classifies them by
  keyword, splits facts out of the article extract, and attaches archival
  imagery. No API key, no cost. Trade-offs are real and documented in
  `pipeline/lite.ts`: no scenario quiz, `region` is the page description, and
  facts are quoted (hence `textCredit`). Writes incrementally every 10 days so a
  long run survives interruption.
- **Batch the Wikimedia calls.** Both `pageimages` (en.wikipedia) and
  `imageinfo` (Commons) accept up to 50 titles per request, which turns a day
  from ~24 calls into 2 — the difference between ~8 s and several minutes per
  day, and no 429s. `pipeline/imagery.ts` does this; prefer it over
  `resolveArchivalImage` for anything bulk. Do NOT try to rewrite the width in a
  thumbnail URL: Wikimedia rejects sizes it has not rendered with a 400, so ask
  the API via `pithumbsize` instead.
- `npm run pipeline:fixture -- [--days 7]` — slices a small window of the
  database into the bundled fixture. The full archive is ~9 MB (≈2 KB/event) and
  must never be bundled; the fixture only covers first launch before the remote
  manifest loads.
- `npm run pipeline:archival` — single-article imagery resolution. Resolves each
  event's backdrop from its Wikipedia article's lead image via
  `pipeline/archival.ts`, then writes `imageUrl`, `imageCredit`,
  `imageSourceUrl`, and `imageAspect` into both `pipeline/events-db.json` and
  the bundled fixture. For a history app this beats generated art on the axis
  that matters: a real 1944 photograph *is* the history. It is also keyless and
  unlimited. Only free licenses (public domain / CC) are accepted — anything
  else is rejected rather than shipped. Events carry `wikiTitle` (the content
  generator emits it; `SEED_WIKI_TITLES` in `fetch-archival.ts` backfills older
  ones). `--force` re-resolves, `--dry` previews.
- **Aspect matters.** Archival art is mostly landscape; a 9:16 cover-crop shows
  barely a third of a 1.4:1 painting and can cut the subject out entirely. So
  `imageAspect` is stored in the manifest and `CardBackdrop` letterboxes
  anything wider than 0.9 into the upper half over a blurred copy of itself.
  Bright paintings also washed out the old scrim — hence `palette.scrimMid`,
  the 68% bottom gradient, and the glass era badge.
- `npm run pipeline:generate` — per-event imagery + full archive `manifest.json`
  into `docs/` (GitHub Pages). `pipeline/prompt.ts` builds an event-specific
  prompt (title + region + year + era flavor, vertical 9:16, quiet lower third
  for the text, no lettering) and seeds it deterministically from the event id,
  so re-runs reproduce the same image. Providers live behind
  `pipeline/providers.ts` — add new ones there, never inline in `generate.ts`.
  As of 2026 no keyless image API works (Pollinations 402s anonymously), so a
  token is required: `HF_TOKEN` (FLUX) or `POLLINATIONS_TOKEN`. Without one the
  generator is reuse-only and **must not** substitute generic imagery (rule 6).
  Higgsfield is the user's preferred generator when its MCP is authorized — it is
  an OAuth-gated MCP connector, so it only works in an interactive session where
  the user has connected it.
- `npm run validate:manifest` — gates the fixture against the runtime schema.
- Audio Briefings (planned): pre-generate MP3 per event with **OpenAI TTS**
  (decided), host in `docs/audio`, add `audioUrl?` to the schema, play with
  expo-audio behind `ProGate`.

## Long pipeline runs

A 366-day build takes ~2 hours and WILL be interrupted. Two hard-won rules:

- **Never run two Wikimedia pipelines at once.** They share one rate-limit
  budget and starve each other; the first full rebuild died at day 158 this way.
- `fetchJson` retries thrown network faults (DNS, socket reset, timeout) as well
  as 429/5xx, and `build-day-lite` catches per DAY and names the failures at the
  end. Both exist because a run died at day 190 on a single
  `ENOTFOUND en.wikipedia.org`. Do not remove either.

Resume by finding what is actually stale rather than guessing a date: lite ids
match `^evt-\d{2}-\d{2}-`, so any dateKey with no such event has not been
rebuilt under the current scheme.

## Verification gate — run before claiming anything is done

This project has no device CI; these are the gate:

1. `npm run typecheck` — runs **both** `tsconfig.json` (app) and
   `tsconfig.node.json` (pipeline/scripts). Both must pass.
2. `npm run lint` — `expo lint`, must be clean (fix unused imports, etc.).
3. For previewable UI changes, verify in the browser preview (Expo web on
   `--port 8081`) or smoke-test the bundle: `npx expo export --platform android`.
4. If you touched the manifest/schema, `npm run validate:manifest`.

Reporting rule: if a check fails, say so with the output. State "done" only after
the gate is green.

## Driving the running web app (verification recipes)

Run Expo web on port 8081 and drive it with whichever browser MCP this session
has (`Claude_Browser` / `Claude_Preview` / Chrome tools — the exact server has
changed between sessions; check what's loaded rather than assuming). These
React-Native-Web quirks cost hours to rediscover:

- **A synthetic `click` does NOT fire `Pressable.onPress`** — especially inside a
  `ScrollView`. Dispatch a full `pointerdown → pointerup → click` sequence on the
  element (find it by `aria-label`, which RNW renders from `accessibilityLabel`).
- **Simulating a feed swipe** needs `buttons: 1` and `pointerType: 'touch'` on
  the move events, or react-native-gesture-handler ignores them. Recipe:
  `pointerdown` at ~y460 → several `pointermove` up to ~y40 (all with
  `buttons: 1`) → `pointerup`. The swipe commits on **distance** (>22% of screen)
  even at ~0 velocity, so synthetic drags work without realistic timing. Allow
  ~900 ms between swipes for the settle spring.
- **Since gesture-handler 2.32 (SDK 57) the recipe above throws**
  `NotFoundError: Failed to execute 'setPointerCapture'` — the handler now
  captures the pointer, and a synthetic `pointerId` is not one the browser
  knows. Stub it in the page first, test-only:
  `Element.prototype.setPointerCapture = () => {}` (and `releasePointerCapture`,
  `hasPointerCapture = () => true`), then run the recipe. Real fingers are
  unaffected. A plain `left_click_drag` from the browser tool is a MOUSE
  pointer and is ignored by the feed's pan, as before.
- **Scrolling**: RNW `ScrollView` is a nested overflow div — set that element's
  `scrollTop`, not `window.scrollY`.
- **Client-side navigation**: `location.href = '/route'` does a full reload and
  wipes in-memory stores (the feed deck disappears, so `/quiz` shows its empty
  state). Use `history.pushState` + a `popstate` event, or tap the in-app control,
  to navigate while preserving state.
- **Pro states**: flip `localStorage['history-unlocked.dev.pro.v1']` to
  `'true'`/`'false'` and reload, or tap the `__DEV__` Pro toggle in the profile.
