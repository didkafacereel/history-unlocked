# The Old History — channel videos

Videos for the YouTube channel **The Old History - Battles & Rulers**
(@TheOldHistoryBattlesAndRulers), separate from the app's nightly daily.
Same tools and rules as `../DAILY.md` (licence gate, honesty with pictures
and film, checks), with these differences (the user, 5 Oct 2026):

- `node ../tools/new-day.mjs <date> <slug> --channel` → `old-history/<slug>/`,
  `"mode": "channel"` in script.json, the channel avatar as the end-card icon.
- **Never mention the app.** No "on this day" (set `cover.kicker` and the
  title scene's `kicker`). The end card comes from `old-history/channel.json`.
- **A new `cta` every video**, born from the story, asking to subscribe;
  make.mjs refuses one already in `old-history/log.json`.
- Length 45–100 s (the channel's hits ran 1:40–2:18). Strange-but-true,
  one-person stories win (Onoda 609K, Pujol 82K).
- `post.pinned`: a debate question for the pinned comment.
- Output: `old-history/ready/<slug>/` — mp4, cover.jpg, POST.md. No app clip,
  no R2 upload, nothing in `../log.json`.
- A Commons film over 400 MB: download its transcode at the original
  resolution into `<slug>/.clips/cache/<original file name>` by hand; clips.mjs
  then reads it from there.

## Style v2 — 26 Oct 2026 (the user: "bigger, coloured captions — raise the level")

Everything below is the default now; every new channel clip is made this way.

**Captions** (`tools/lib/compose.mjs`, `tools/lib/scenes.mjs`)
- 116 px Anton (fits down to 74 px), 12 px black outline, drop shadow — ~45% bigger than v1.
- Words pop in one by one in step with the voice; emphasised words land bigger (back-out bounce).
- Three emphasis colours, set in script.json:
  - `"highlight": [...]` → **gold** (names, places, the key noun);
  - `"alert": [...]` → **red** (death, danger, the shock word: KILLED, POISON, SHOT, BOMB);
  - numbers are detected automatically and sit in a **gold box** (1945, $200,000, 133, 37).
- Aim for 8–12 highlight words and 6–10 alert words per clip.

**Scene text**: statements/photo lines ~15% bigger; kicker 54 px; facts 52 px with shadow.
In any scene text `*word*` = gold, `!!word!!` = red.

**Thumbnail** (`old-history/make_thumbs.py`, run automatically by make.mjs in channel mode)
→ `ready/<slug>/thumbnail.jpg`, 1080×1920: the REAL archive photo (never an AI face — VidIQ's
AI thumbnails could not take a reference photo and would invent the person), autocontrast,
split-tone tint, vignette, three huge Impact lines (one gold), a kicker pill, an accent bar.
Optional `"thumb": { "image", "focus" (0–1), "zoom", "lines": [3], "hi", "tint": [r,g,b], "kicker" }`
in script.json; otherwise it is built from `cover`. Upload it in YouTube Studio (desktop).

**Upload texts with VidIQ** (before writing post.youtube)
- `vidiq_keyword_research` on the person + the event (5 credits each): put the strongest phrases
  first in the title and in a closing "Keywords:" line of the description.
- Tags: 28–33, up to ~480 characters — topic tags from the research first, then the channel set:
  history, history shorts, true story, history documentary, history explained, world history,
  weird history, history facts (+ ww2 tales / ww2 stories / military history for war stories,
  true crime / unsolved mysteries for mysteries).
- `vidiq_score_title` (5 credits): score 2 variants, keep the higher one (aim ≥ 88).

**Music**: always thematic and period-matched (see music/library.json); `make.mjs` re-muxes
mix.wav if the renderer comes out quieter than −16 LUFS.
