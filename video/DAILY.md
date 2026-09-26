# The nightly video — playbook

Every evening at 20:00 a scheduled Claude session makes **tomorrow's** video
by following this file, start to finish, without asking anything. The user
reviews it in the morning and posts it themselves. This file is the whole
brief: the voice, the look, the rules and the checks all live here or in the
tools it names.

Every command below is `node D:/android/history-unlocked/video/tools/…` with
**absolute paths, exactly as written** (Bash tool) — those are pre-approved,
so the run never stops for permission. Nothing else is needed, and nothing
else should be run: no `cd`, no PowerShell, no other programs. Read and write
files only under `D:/android/history-unlocked/video/` (Read / Write / Edit
tools).

## Never

- **Never publish, post, upload or send anything anywhere.** The video goes
  to `video/ready/` and to the user; they post it.
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

Read `video/.research/<MM-DD>/candidates.md`. Choose ONE event:

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
image). Choose 6–9: one striking picture for the cover, one for the title,
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

## 4. Write script.json

Model: `video/day-2026-09-26-petrov/script.json` — copy its shape.

**The voice** (decided with the user): `am_michael` at 0.9, set in
`channel.json`. Length **50–60 s**: about **115 words of story** in 10–12
sentences (`make.mjs` adds the two end-card lines itself — do not write them).

**Sentences.** Each has `say` (for the voice) and `show` (for the captions):

- `say`: numbers spelled out ("nineteen eighty-three", "a hundred and
  eighty-five"); `show`: digits ("1983", "185"). `make.mjs` refuses digits in
  `say`.
- Short, spoken English. One idea per sentence. No semicolons.
- `pauseAfter`: 0.35 inside a beat, 0.45–0.5 between beats, 0.6–0.7 before a
  twist or payoff. Varied pauses are what stopped the first cut sounding AI.
- **s1 is the hook**: "On this day in <year>, <the whole story in one surprising
  line>." Then set-up → tension → the turn → the payoff → a short, human last
  line (often an irony or a quote from the sources).
- Ids: `s1`, `s2`, `s3a`, `s3b`… (a/b when two sentences share a scene).

**Cover** (the thumbnail — also the first frames of the video):
`lines`: 2–3 lines, 2–12 characters each, ALL CAPS, the hook in the fewest
words ("THE MAN WHO / *SAVED* / *THE WORLD*"). `*word*` turns it gold. Pick
the most dramatic, readable picture; `focus` moves it ("50% 70%").

**Scenes**: 6–8, one per beat, each opening on a sentence (`from`). First is
always `title`. `enter`: `"fade"` normally, `"cut"` for a hard turn (a shock,
a reversal). Every text field is a string or `{ "text": "...", "at": <cue> }`.
Cues: `"s4"` (sentence start), `"s4@0.5"` (halfway through), `"s4+0.3"`,
or a number of seconds into the scene. Text: `*word*` = gold.

| type | for | fields |
| --- | --- | --- |
| `title` | always first | `image`, `focus`, `date` ("26 SEPTEMBER"), `year`, `place`, `move` |
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

- **too long / too short** → cut or add words (it says how many), run again
- **cue after the scene ends** → move the cue earlier or the scene later
- **hyperframes check error** (overlap, overflow) → shorten the text, or pick
  another scene type; run again

Then **Read every `video/day-<date>-<slug>/snapshots/contact-sheet*.jpg`** (split into `-1`, `-2` past 8 frames) and check
every frame:

- the cover is striking and its text readable at a glance
- faces are not cut off (fix `focus`), nothing important under the captions
- no text overflows or collides; nothing says something the voice does not
- the picture in each scene matches what is being said

Fix and re-run until it is right (the voice is cached; re-runs take ~2 min).

## 6. Render and deliver

```bash
node D:/android/history-unlocked/video/tools/make.mjs D:/android/history-unlocked/video/day-<date>-<slug> --render-only
```

(Use `--render-only` only when the last `--no-render` run passed and nothing
changed since; otherwise run without flags.) It renders, verifies length and
loudness, cuts `cover.jpg`, writes `video/ready/<date>-<slug>/` with the mp4,
cover and `POST.md`, and logs the day in `video/log.json`.

Then:

1. **Send the user** the mp4, `cover.jpg` and `POST.md` from
   `video/ready/<date>-<slug>/` (SendUserFile, status `proactive`).
2. **Notify** (PushNotification, under 200 characters), e.g.
   `Tomorrow's video is ready: Petrov, 1983 (58s). Captions in POST.md.`
3. End with a 3–4 line summary in **Bulgarian** (the user writes Bulgarian):
   the story, why this one, anything uncertain.

## If something goes wrong

Try to fix it (another story, other pictures, shorter text) — up to about an
hour in total. If it still cannot be made, **notify the user** with the
reason in one line (in Bulgarian) and stop. A missing video is better than a
wrong one. Never skip the checks to get something out.
