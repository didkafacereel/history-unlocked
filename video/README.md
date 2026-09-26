# Daily TikTok shorts

One 50–60-second vertical video a day, from the same archive the app reads —
the distribution engine in the income plan (see `HANDOVER.md`). English,
one story, AI voice, public-domain images and music only.

**Automated since 25 September 2026.** Every evening at 20:00 a scheduled
Claude session makes tomorrow's video by following **[DAILY.md](DAILY.md)**,
and leaves it in `ready/<date>-<slug>/` (mp4 + cover.jpg + POST.md with the
TikTok and Facebook captions) for the user to review and post. Nothing is
ever posted automatically.

**Decided with the user, 24–25 September:** voice `am_michael` at speed
**0.9**, with pauses that vary by what comes next — an even tempo with no
breath is what gave the first cut away as AI. Length 50–60 s. A quiet music
bed ("easy on the ear"), ducked under the voice. Every video opens on a
designed **thumbnail** frame (the cover). The end card never names the
channel; it follows the app's stage in `channel.json`.

## Layout

| Path | What |
| --- | --- |
| `DAILY.md` | the nightly playbook — story choice, script rules, checks, delivery |
| `channel.json` | voice, speed, and the end card for each app stage (pre-launch → closed test → launch). Change `stage` and every later video says the right thing |
| `music/library.json` | the beds, with moods; `LIBRARY.md` is the licence record |
| `shared/` | fonts (OFL) and the app icon, copied into each new day |
| `log.json` | every video made — for variety, and a record |
| `day-<date>-<slug>/` | one video: `script.json` is the source of truth |
| `day-1869-black-friday/`, `day-1066-stamford-bridge/` | the two hand-built days that set the look (template-based, built with `build-*.mjs`) |

## Tools (`tools/`, run from the repo root)

| Command | Does |
| --- | --- |
| `research.mjs tomorrow` / `MM-DD` | the day's events, the app's own first, with a public-domain image count each |
| `research.mjs MM-DD --fetch "Article"` | save articles as plain text — the only allowed source of facts |
| `new-day.mjs YYYY-MM-DD slug` | scaffold a day's folder |
| `images.mjs <day> list --page … --search …` | numbered contact sheet of public-domain candidates |
| `images.mjs <day> get <n\|File:…> name` | download one (licence re-checked; anything not PD/CC0 is refused) |
| `make.mjs <day> [--no-render\|--render-only]` | voice → narration → mix → compose → check → snapshots → render → verify → deliver |
| `app-clip.mjs <day>` | the in-app version (app update 1.1, Cloudflare R2): 720p, ~2 MB, cut before the end card; `make.mjs` runs it after every render, into `app-clips/` + `index.json` |
| `fetch-music.mjs` | download any missing music (licence re-checked) |

`lib/scenes.mjs` is the scene library (title, pair, statement, number,
photo, document, portrait, quote, end card, cover); `lib/compose.mjs` turns a
script into `index.html`; `lib/audio.mjs` is voice, narration and mix.

## Rules that are not negotiable

- **Every claim comes from the sources** fetched by `research.mjs`. The
  archive's own `facts` often describe the linked hub article rather than the
  event, and its titles are cut at 90 characters.
- **Public domain / CC0 only**, images and music (composition and recording).
  CC BY-SA carries share-alike, which a video would inherit.
- **Loudness** -14 LUFS (TikTok/Reels/Shorts); the bed sits at -31 LUFS.
- **Nothing is posted automatically.** The user posts.

## Requirements (this PC)

Node 24, ffmpeg/ffprobe on PATH, Python 3.13 with `kokoro-onnx` + `soundfile`
at `C:\Users\poten\AppData\Local\Programs\Python\Python313` (3.14 is not
supported), `npx hyperframes@0.8.72`.
