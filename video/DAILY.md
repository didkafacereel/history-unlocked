# The nightly video — playbook

Every evening at 20:00 a scheduled Claude session starts **tomorrow's** video
by following this file. **The user picks the story** (their rule, 30 Sep):
the session offers the day's best topics, the user chooses one, and only then
is the clip made — start to finish, without asking anything else. The user
posts it themselves. This file is the whole brief: the voice, the look, the
rules and the checks all live here or in the tools it names.

Every command below is `node D:/android/history-unlocked/video/tools/…` with
**absolute paths, exactly as written** (Bash tool) — those are pre-approved,
so the run never stops for permission. Nothing else is needed, and nothing
else should be run: no `cd`, no PowerShell, no other programs. Read and write
files only under `D:/android/history-unlocked/video/` (Read / Write / Edit
tools).

**Nobody is there to approve anything.** The first nightly run (26 Sep) sat
for three hours on one permission prompt after fixing a too-long script. If a
command would need approval, it is written in the wrong form: rewrite it as
exactly `node D:/android/history-unlocked/video/tools/<tool>.mjs …` and run
that instead. Never wait.

## Never

- **Never publish, post, upload or send anything anywhere** — with ONE
  exception: `publish-films.mjs` (step 6), which puts the in-app cut into the
  app's own film storage. The user asked for that on 29 Sep ("automatically,
  every night"). Social posts stay the user's: the video goes to
  `video/ready/` and to the user; they post it.
- Never commit, push, install packages, or touch anything outside `video/`.
- Never use an image that `images.mjs get` did not fetch — it is the licence
  gate (public domain / CC0 only). Never draw, generate or "recreate" an image.
- Never name the TikTok channel (it is called something else than the app).
- Never state a fact that is not in the fetched sources. No invented numbers,
  quotes, dialogue or motives. "May have", "is credited with" where the
  sources hedge.

## 1. Pick the story (≈10 min)

```bash
node D:/android/history-unlocked/video/tools/research.mjs tomorrow
```

If it prints `ALREADY MADE`, stop: notify the user that tomorrow's video
already exists, and end.

Read `video/.research/<MM-DD>/candidates.md` and draw up a **shortlist of 3–5
events** that pass the rules below.

**The user chooses** (their standing rule since 30 Sep: "give me the topics
every day before you start the clip, and I pick which one"). Never start a
clip on a story the user has not picked. For each topic give, in Bulgarian:
the year and title, the hook in one line (the twist), whether real archive
film is likely (check with a quick `clips.mjs list` or the Commons search when
unsure), whether it is in the app, and its category. Put your recommendation
first. Then:

- **In a session with the user** — ask with AskUserQuestion (one option per
  topic, recommendation first) and wait for the answer.
- **In the unattended nightly run** — write the shortlist to
  `video/.research/<MM-DD>/SHORTLIST.md`, send it (SendUserFile, status
  `proactive`), notify (PushNotification, e.g. `Теми за утрешния клип са
  готови — избери една`), and **stop there**. The clip is made in the next
  session, once the user has picked; it starts again from the fetch below.

If the user picks something off the list (another event of the day), use that.

The rules for the shortlist:

1. **A story, not a fact.** It needs a turn: a twist, a decision, a reversal,
   an irony, a "one person / one moment" hinge. "X was founded" is not a story.
2. **Pictures.** At least 5 usable public-domain images across its articles
   (the count is shown). Under 4 → pick another.
3. **Prefer events in the app** (listed first) — the video advertises it.
4. **Variety.** Check "Last videos": not the same category three days running;
   not the same music two days running.
5. **Skip:** mass shootings, terror attacks, kidnappings, and any tragedy
   less than 30 years old. `⚠ solemn` events only if the story is about
   people's courage or ingenuity, told gently (use `grieg-aase-death`).
6. Famous and dramatic beats obscure — a hook the viewer already half-knows
   ("the man who saved the world", "the Viking Age ended at a bridge") wins.

Then fetch the articles and **read them fully**:

```bash
node D:/android/history-unlocked/video/tools/research.mjs <MM-DD> --fetch "Article one" "Article two"
```

Sources land in `video/.research/<MM-DD>/sources/`.

## 2. Start the day

```bash
node D:/android/history-unlocked/video/tools/new-day.mjs <YYYY-MM-DD> <slug>
```

`<YYYY-MM-DD>` is tomorrow; `<slug>` 1–3 lowercase words (`petrov`,
`stamford-bridge`). This creates `video/day-<date>-<slug>/`.

## 3. Pictures

```bash
node D:/android/history-unlocked/video/tools/images.mjs D:/android/history-unlocked/video/day-<date>-<slug> list --page "Article" --page "Other article" --search "commons search words"
```

**Look at `video/day-<date>-<slug>/.candidates/sheet.jpg`** (Read it — it is an
image). Choose 8–12 (with 2–4 film shots from step 3b, that feeds 14–18
scenes; the one real picture of the event may be used 3–4 times with
different `focus` crops): one striking picture for the cover, one for the title,
people's faces for pair/portrait scenes, documents/maps/art for the rest.
Search Commons more if the articles are thin: US government photos (military,
NASA, White House), pre-1929 paintings and photographs, Soviet stamps, old
engravings are usually public domain.

Honesty with pictures: a picture shows what the scene says it shows. Do not
pass off an American control room as a Soviet bunker, or one battle's
painting as another. If a picture is only illustrative, say so on screen
(e.g. the `credit` line: "Sunlight on clouds, seen from orbit · NASA").

**The picture must match the words spoken over it** — the user caught both of
these in the first automated video, and they are the rule now:

- **Never name a person while showing someone else.** "Stanislav Petrov was
  on duty…" over portraits of Reagan and Andropov reads as "this is Petrov".
  When the person named has no public-domain picture, give that sentence its
  own `statement` scene with their NAME as the main text — not another face.
  If two people or sides frame the story, give THEM their own sentence
  ("It was the height of the Cold War.") for the `pair` scene.
- **Show the thing itself, not a symbol of it.** "Sunlight on clouds fooled
  the satellites" wants a photograph of sunlight on clouds, not a postage
  stamp of a satellite. Stamps, coats of arms and maps are a last resort.

`make.mjs` prints, for every scene, its pictures and the exact words spoken
while it is on screen. Read that list line by line next to the contact
sheet: any line where the words name or describe something the pictures do
not show is a scene to fix.

```bash
node D:/android/history-unlocked/video/tools/images.mjs D:/android/history-unlocked/video/day-<date>-<slug> get <n> <name>
```

## 3b. Archive film (the user's choice, 28 Sep: "real footage builds trust")

Look for real public-domain film of the event, the place, the people or the
era — newsreels, US government films, NASA, early cinema. Try the event's
articles first, then searches (a war, a place, a decade + "newsreel", a
machine):

```bash
node D:/android/history-unlocked/video/tools/clips.mjs D:/android/history-unlocked/video/day-<date>-<slug> list --page "Article" --search "search words" --file "File:Exact name.webm"
```

**Read `.clips/sheet.jpg`** (four frames per film). For a promising film,
find the exact seconds:

```bash
node D:/android/history-unlocked/video/tools/clips.mjs D:/android/history-unlocked/video/day-<date>-<slug> scan <n> --from 600 --to 700 --every 2
```

**Read `.clips/scan.jpg`** — every frame is stamped with its second. Scan the
whole film coarsely first (`--every 40`), then the good stretches finely.
Then cut 2–4 shots, each a little longer than its scene (4–5 s):

```bash
node D:/android/history-unlocked/video/tools/clips.mjs D:/android/history-unlocked/video/day-<date>-<slug> get <n> <name> --at 1197.5 --len 4
```

The shot lands in `assets/<name>.mp4` as a 1080×1920 band over a blurred copy
of itself (`--fit fill` crops to full screen — only for sharp HD film;
`--color` keeps colour). Pick moving shots: a plane in flight, a hand on a
lever, a crowd, a ship — motion is the point.

**Honesty rules for film** (as for pictures, only stricter — moving pictures
read as "this is the event"):

- Every `film` scene has a `credit` line on screen saying what it is. When it
  is not the event itself, it ends "archive film, illustrative".
- Same era, same kind of thing, and never the other side: a US 1944 bomber
  may stand in for "a 1940s twin-engine plane"; German bombers may NOT stand
  in for Australian trainers (Brocklesby, 28 Sep: *Why We Fight* rejected).
- Never over a sentence that names a person, unless the film shows that
  person.
- No suitable film → none. A video with only stills is fine; a misleading
  shot is not.

`upload.wikimedia.org` answers bursts with 429 — the tool waits and retries
by itself; just run it again if it still fails.

## 4. Write script.json

Model: `video/day-2026-09-29-brocklesby-v2/script.json` — copy its shape.

**The pace** (decided with the user, 28 Sep): `"pace": "fast"` — always.
Voice `am_michael` at 1.0, length **40–70 s** (the user, 30 Sep: "40 to 70,
±5 s is no problem" — `make.mjs` accepts 35–75): about **100–160 words of
story** in 13–20 short sentences — let the story set the length, do not pad
it. A new picture every **2–4 s**: 14–22 scenes. `make.mjs` adds the one
spoken end-card line itself — do not write it.

**Sentences.** Each has `say` (for the voice) and `show` (for the captions):

- `say`: numbers spelled out ("nineteen eighty-three", "a hundred and
  eighty-five"); `show`: digits ("1983", "185"). `make.mjs` refuses digits in
  `say`.
- Short, spoken English. One idea per sentence. No semicolons.
- `pauseAfter`: 0.35 inside a beat, 0.45–0.5 between beats, 0.6–0.7 before a
  twist or payoff. Varied pauses are what stopped the first cut sounding AI.
- **s1 is the hook**: the whole story in one surprising line, no preamble
  ("Two planes collided in mid-air, and landed as one."). **s2** dates it:
  "It happened on this day in <year>." Then set-up → tension → the turn →
  the payoff → a short, human last line (often an irony or a quote from the
  sources).
- Short sentences cut well: "Fuller stayed." is its own sentence and its own
  scene.
- Ids: `s1`, `s2`, `s3`… (or `s3a`, `s3b`).

**Cover** (the thumbnail — also the first frames of the video):
`lines`: 2–3 lines, 2–12 characters each, ALL CAPS, the hook in the fewest
words ("THE MAN WHO / *SAVED* / *THE WORLD*"). `*word*` turns it gold. Pick
the most dramatic, readable picture; `focus` moves it ("50% 70%"). If the
text lands on a face (it starts 560 px down), set `top` (e.g. `860`) to lower
it onto the body — 28 Sep: "ON THIS DAY" sat on Fleming's mouth.

**Scenes**: 14–18, a new picture every 2–4 s. Each opens on a sentence
(`from`: `"s4"`) or inside one (`"s3@0.55"` — cut to the next picture halfway
through a long sentence). The first scene is the hook: the most striking real
picture as a `photo` with no text (`move: "in"`) — the captions carry it. The
`title` scene comes second, on the date sentence. `enter`: `"cut"` for most
changes (it is what makes the pace), `"fade"` for a softer turn. Film scenes
are always `"cut"`. Leave text off most photo scenes; give text to the beats
that need it (a name, a number, the payoff). No scene should be a black
screen with text: give `statement` scenes an `image`. Every text field is a
string or `{ "text": "...", "at": <cue> }`. Cues: `"s4"` (sentence start),
`"s4@0.5"` (halfway through), `"s4+0.3"`, or a number of seconds into the
scene. Text: `*word*` = gold.

| type | for | fields |
| --- | --- | --- |
| `film` | archive film (step 3b) | `clip` ("name.mp4"), `credit` (required — see the honesty rules), `kicker` |
| `title` | the date, second scene | `image`, `focus`, `date` ("26 SEPTEMBER"), `year`, `place`, `move` |
| `pair` | two people / sides | `kicker`, `a` & `b`: {`image`, `focus`, `fit`:"contain", `bg`, `name`, `role`, `at`}, `foot` |
| `statement` | a line that lands | `ghost` (huge faint word), `kicker`, `main`, `fact`, `source`, optional `image` (dimmed) |
| `number` | a figure that counts up | `image`, `label`, `value`, `start`, `prefix`, `suffix`, `unit`, `decimals`, `count`: {`from`,`to`} cues, `sub` |
| `photo` | a picture that tells it | `image`, `focus`, `move` (in/out/left/right/up/down), `kicker`, `line`, `fact` |
| `document` | a wide image in a band | `image`, `focus`, `credit`, `sub` |
| `portrait` | epilogue / a person | `image`, `focus`, `fit`, `kicker`, `date`, `line`, `line2` |
| `quote` | words from the sources | `kicker`, `quote`, `by`, optional `image` |

`highlight`: the story's key words in caps (names, the number, the twist
word) — they turn gold in the captions. 3–4 digit numbers are gold anyway.

`music.track`: pick by mood from `video/music/library.json`.

`post.tiktok` (≤ 400 chars: a hook line, 2–3 lines of story, "Follow to find
out when our app comes out 📜", 6–8 hashtags incl. #history #onthisday
#historytok) and `post.facebook` (a 4–6 short-paragraph retelling ending
"Every day has a story like this. Follow the page to find out when our app
comes out. 📜" + 3–4 hashtags). Same facts as the video, nothing more.

`sources`: one line per article, listing the facts used.

## 5. Build, look, fix

```bash
node D:/android/history-unlocked/video/tools/make.mjs D:/android/history-unlocked/video/day-<date>-<slug> --no-render
```

It voices, times, mixes, composes and checks. It stops with a reason when:

- **too long / too short** → cut or add words (it says how many), run again.
  Cheapest first: take 0.1 s off three or four of the longest `pauseAfter`
  values (never below 0.35), then make one sentence more concise. Only the
  changed sentence is re-voiced. (27 Sep: 62.2 s → 61.4 s this way.)
- **film is shorter than its scene** → cut a longer shot (`clips.mjs get
  --len`) or open the next scene earlier
- **cue after the scene ends** → move the cue earlier or the scene later
- **hyperframes check error** (overlap, overflow) → shorten the text, or pick
  another scene type; run again

Then **Read every `video/day-<date>-<slug>/snapshots/contact-sheet*.jpg`** (split into `-1`, `-2` past 8 frames) and check
every frame:

- the cover is striking and its text readable at a glance
- faces are not cut off (fix `focus`), nothing important under the captions
- no text overflows or collides; nothing says something the voice does not
- the picture in each scene matches what is being said
- no frame is a near-black screen with a line of text; film frames show the
  footage in its band with the credit line above it

Fix and re-run until it is right (the voice is cached; re-runs take ~2 min).

## 6. Render and deliver

```bash
node D:/android/history-unlocked/video/tools/make.mjs D:/android/history-unlocked/video/day-<date>-<slug> --render-only
```

(Use `--render-only` only when the last `--no-render` run passed and nothing
changed since; otherwise run without flags.) It renders, verifies length and
loudness, cuts `cover.jpg`, writes `video/ready/<date>-<slug>/` with the mp4,
cover and `POST.md`, and logs the day in `video/log.json`.

It also cuts the in-app version into `video/app-clips/`. Put it in the app:

```bash
node D:/android/history-unlocked/video/tools/publish-films.mjs
```

It uploads whatever is new to Cloudflare R2 and rewrites `films.json`; the
app shows the film on that date's lead card. If it fails (network, or
"wrangler is not logged in"), say so in the final message — the TikTok video
is still delivered, and the next night's run uploads both days.

Then:

1. **Send the user** the mp4, `cover.jpg` and `POST.md` from
   `video/ready/<date>-<slug>/` (SendUserFile, status `proactive`).
2. **Notify** (PushNotification, under 200 characters), e.g.
   `Tomorrow's video is ready: Petrov, 1983 (58s). Captions in POST.md.`
3. End with a 3–4 line summary in **Bulgarian** (the user writes Bulgarian):
   the story, why this one, anything uncertain.
4. **Then the upload info, always, in the final message itself** (the user
   asked on 29 Sep: after every clip, the TikTok and Facebook text ready to
   copy — not only in POST.md). In English, exactly as in POST.md:
   - `### TikTok`, then the whole `post.tiktok` in a fenced ``` block (one
     block, so it copies in one go), then the cover note: "Cover: first
     frame / cover.jpg".
   - `### Facebook`, then the whole `post.facebook` in its own fenced block.
   - One line naming the file to upload: `video/ready/<date>-<slug>/<date>-<slug>.mp4`.

## If something goes wrong

Try to fix it (another story, other pictures, shorter text) — up to about an
hour in total. If it still cannot be made, **notify the user** with the
reason in one line (in Bulgarian) and stop. A missing video is better than a
wrong one. Never skip the checks to get something out.
