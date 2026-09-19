# Content & imagery pipeline

Everything the app reads is produced here and validated by the **same Zod schema
the app enforces** (`src/data/manifest/schema.ts`) — the pipeline cannot publish
what the app would reject.

`pipeline/events-db.json` is the master database. The app never reads it
directly; it reads a published manifest (see [Publishing](#publishing)).

## The short version

```sh
npm run pipeline:lite -- --date 09-08 --days 7   # build real content, free
npm run pipeline:people -- --date 09-08 --days 7 # births, deaths, observances
npm run pipeline:reclassify                      # categories + tone (local, instant)
npm run pipeline:publish                         # write public/ + docs/ manifests
npm run pipeline:fixture                         # slice a small offline window
```

## Where content comes from

### 1. Wikimedia "on this day" — free, no key, all 366 days

`onthisday.ts` pulls
`api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/MM/DD`, which returns
~60-95 verified entries per date, most linked to an article with a thumbnail and
sometimes coordinates. This is the backbone of the archive.

`build-day-lite.ts` turns those entries into events with **no language model**:

```sh
npm run pipeline:lite -- --date 03-15                 # one day
npm run pipeline:lite -- --date 01-01 --days 366      # the whole year
npm run pipeline:lite -- --date 03-15 --dry           # preview, write nothing
npm run pipeline:lite -- --date 03-15 --no-fixture    # database only
```

Honest trade-offs, all documented in `lite.ts`: facts are sentences quoted from
the article (hence `textCredit`), `region` is the page's one-line description
rather than always a place, and there is **no scenario quiz**. Titles read like
encyclopedia sentences. The LLM pass below replaces all of that when run.

Long runs flush every 10 days, so an interruption costs at most ten days.

### 2. Claude — authored copy and quizzes

`build-day.ts` is **grounded**: the model may only choose from the same verified
feed candidates and must copy `year` and `wikiTitle` through untouched. Its job
is editorial — pick the strongest dozen, write them in our voice, and author the
scenario quiz. Needs `ANTHROPIC_API_KEY` **with credits** (billed separately
from any Claude subscription).

```sh
npm run pipeline:day -- --date 06-11 --count 12
npm run pipeline:day -- --date 06-11 --candidates    # inspect the raw material, free
```

Authored events (the ones carrying a quiz) are never overwritten by a later lite
rebuild.

### 3. Cornerstones — dates the app may not miss

The feed is excellent but it is not a guarantee. Its curated list for 7 December
holds a furry convention and an Australian cricketer and **no Pearl Harbor** —
the attack is not among the day's 51 candidates at all. So `cornerstones.ts` is
a hand-curated list of ~70 events the app forces into their date.

```sh
npm run pipeline:cornerstones   # verify every title before building
```

The checker is not optional. A mistyped article title fails SILENTLY in the
builder — the event is simply absent, which is the exact failure the list exists
to prevent — so the checker resolves every title and refuses anything without a
free-licensed image. Two entries were dropped or re-pointed because of it.

Cornerstones are injected ahead of the feed and dedupe the feed's own account of
the same event **by year**, not by article title: the feed files the 2001 attacks
under "Al-Qaeda" while the cornerstone names "September 11 attacks", so matching
on title alone left 11 September opening with the same event twice.

They carry `cornerstone: true` into the manifest, which `deckPlan` scores above
everything else — if a reader opens 11 September, the attacks are the first card.

### 4. The register — births, deaths, observances

`build-people.ts` builds the OTHER half of "on this day". The same feed carries
~220 births and ~110 deaths per date, all with an article and a Wikidata
one-liner, and none of it cost anything to fetch.

```sh
npm run pipeline:people -- --date 01-01 --days 366
npm run pipeline:people -- --date 09-12 --dry
```

The whole problem is **choosing**, and the obvious free signal is a trap:
article length ranks a geographer with a 909-character lead above Leonhard Euler
with 823, because lead length measures how someone wrote an article, not how
much the world cares. `people.ts` ranks by **Wikidata sitelink count** — how
many language editions bothered to write about this person. Euler 191,
Brunelleschi 69, a rugby player 3. Free, keyless, batched 50 at a time, and it
returns a complete number.

> Do NOT use `prop=langlinks` for this. Its 500-item limit is spent across the
> whole request, so the first few titles consume it and everyone after comes
> back as zero — which silently ranks the famous below the obscure.

Output goes to `pipeline/people-db.json`, deliberately separate from the events
database so a long events rebuild and a register run can never clobber each
other's file. `publish-manifest.ts` merges the two.

Each entry carries a **free-licensed portrait and a short biography**, resolved
through the same batched licence check the events use — three extra requests per
day for the final nine people, and 94% of them have a usable image. The 6% who
do not get a monogram in the app rather than a gap.

Two filters matter here. The feed sometimes links a birth or death to the
article for the YEAR rather than the person, so "AD 81 · Calendar year" appeared
under *died on this day*; `NOT_A_PERSON` and `YEAR_TITLE` drop those. And
religious feast days are stripped from the observances, because six of a typical
date's eight holidays are feast days and they read as noise beside "Day of the
Sun (North Korea)".

## Imagery

Backdrops come from the linked Wikipedia article's lead image, with the Commons
licence read alongside it. Only free licences (public domain / CC) are accepted;
anything else is skipped rather than shipped.

Two paths:

- `imagery.ts` — **batched**, used by every bulk build. Both endpoints accept up
  to 50 titles per request, which turns a day from ~24 API calls into 2. Use
  this for anything at scale.
- `archival.ts` — single-article resolution, plus the shared `fetchJson` that
  every Wikimedia request goes through (identifies the client, honours
  `Retry-After`, backs off on 429/5xx).

Two things worth knowing before you touch this code:

- **Never rewrite the width in a thumbnail URL.** Wikimedia returns 400 for
  sizes it has not rendered. Ask the API with `pithumbsize` instead.
- Aspect ratio is stored (`imageAspect`) because archival art is mostly
  landscape, and a 9:16 cover-crop would show barely a third of it. The card
  letterboxes anything wider than 0.9 over a blurred copy.

`generate.ts` (AI image generation via `HF_TOKEN` / `POLLINATIONS_TOKEN`) still
exists for events with no archival image, but archival sources are preferred: a
real photograph *is* the history.

## Categories

Eight of them, including `Nations & Empires` (founding of states, independence,
unification, dissolution) and `Sports & Games`. Lite builds classify by keyword;
`reclassify.ts` re-runs that logic **locally over the database** so improving a
rule never requires refetching anything:

```sh
npm run pipeline:reclassify -- --dry   # see what would change
npm run pipeline:reclassify
```

It only touches lite entries — a keyword rule must not overrule a category the
model chose deliberately.

## Tone

`sensitivity` (`standard` | `solemn`) marks events where a death toll IS the
event: genocides, massacres, famines, mass-casualty disasters. 121 of 3820
qualify — the rule is narrow on purpose, and battles, defeats and assassinations
stay standard, because history is full of them and the app has to be able to
hold them.

It hides nothing. It only silences the app's own celebration and collecting
language: no confetti on a quiz round that touched a massacre, and the disaster
collection reads "read" rather than "collected" and never turns green. Derived
by keyword in `lite.ts` and re-derivable offline by `pipeline:reclassify`, for
authored events too — the celebration rules are the app's, not the writer's.

## Publishing

The full archive is roughly **9 MB** (~2 KB per event). That is far too large to
bundle inside the app, so it is split:

| Artifact | Contents | Purpose |
| --- | --- | --- |
| `pipeline/events-db.json` | every event | master database, never shipped |
| `pipeline/people-db.json` | the register | master database, never shipped |
| `public/manifest.json` | everything | served by the Expo dev server — the whole archive works locally with no hosting |
| `docs/manifest.json` | everything | what GitHub Pages publishes |
| `src/data/manifest/sample-manifest.json` | ~7 days | bundled offline fallback for first launch |

```sh
npm run pipeline:publish              # writes public/ and docs/
npm run pipeline:fixture -- --days 7  # slices the bundled window
```

In development the app resolves the manifest from the Expo dev server
automatically (`manifestSource.ts`), so no configuration is needed to browse the
full archive locally — including on a phone over the LAN.

For production:

1. Push the project to GitHub.
2. **Settings → Pages** → deploy from `main`, folder `/docs`.
3. Set `EXPO_PUBLIC_MANIFEST_URL=https://USER.github.io/REPO/manifest.json`.

The app fetches that on launch, caches it in AsyncStorage, and falls back to the
cache offline — then to the bundled fixture on a first-ever offline launch.

`.github/workflows/daily-manifest.yml` runs the image/manifest step daily and
commits `/docs`.

## Licensing

Wikipedia text is CC BY-SA. Lite events quote it and therefore carry a
`textCredit` shown on the card; authored events are written from scratch and do
not. Image credits (`imageCredit`, `imageSourceUrl`) are attached to every event
and displayed. Do not remove these — they are the terms under which we may use
the material.
