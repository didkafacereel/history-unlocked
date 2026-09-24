# Daily TikTok shorts

One ~30-second vertical video a day, from the same archive the app reads —
the distribution engine in the income plan (see `HANDOVER.md`). English,
one story, AI voice, public-domain images only.

The first one is `day-1869-black-friday/` (24 September), built by hand to set
the look before any of this is automated.

## What a day is made of

| File | What |
| --- | --- |
| `script.json` | the narration, sentence by sentence: what is **said** and what is **shown** (numbers are spelled out for the voice, printed as digits on screen), plus the sources |
| `audio/<id>.wav` | one file per sentence, from the local Kokoro voice |
| `narration.wav`, `timings.json` | joined by `tools/build-narration.mjs`, with each sentence's measured start and end |
| `index.html` | the HyperFrames composition — six scenes, captions built from the timings |
| `assets/`, `fonts/` | public-domain images from Wikimedia Commons; Anton and DM Serif Display (OFL) |

## Rules that are not negotiable

- **Every claim comes from the sources.** The Wikimedia "on this day" entry
  and the linked Wikipedia articles, fetched fresh — the archive's own `facts`
  often describe the linked hub article (NASA, Jay Gould) rather than the
  event itself, and its titles are cut at 90 characters.
- **Public domain images only.** Checked per file against Commons
  `LicenseShortName`. CC BY-SA carries share-alike, which a video would inherit.
- **Wikimedia URLs:** strip `?utm_*` before using a file name, and request
  only standard thumbnail widths (1920 works, 1600 is refused with a 400).
- Loudness: narration is normalised to -14 LUFS in `build-narration.mjs`.

## Reproducing a day

```bash
# voice: Python 3.13 with kokoro-onnx + soundfile (3.14 is not supported)
$env:HYPERFRAMES_PYTHON = "C:\Users\poten\AppData\Local\Programs\Python\Python313\python.exe"
npx hyperframes@0.8.72 tts "<sentence>" --voice bm_george --output audio/s1.wav
node ../tools/build-narration.mjs
npx hyperframes@0.8.72 check
npx hyperframes@0.8.72 render --quality standard
```

## Not built yet

Choosing the day's story, fetching its sources and images, writing the
script, and filling a template — the steps that make this daily and passive.
