/**
 * Fill a day's composition template with times measured from its narration.
 *
 *   node ../tools/build-composition.mjs      (run inside a day's project folder)
 *
 * Reads  script.json (which phrase opens which scene), timings.json (when each
 *        phrase is actually spoken), index.html.tpl
 * Writes index.html
 *
 * Nothing in the template carries a hand-typed second. Scene boundaries follow
 * the phrase that opens them, and every cue inside a scene is written against
 * the phrase it illustrates — so changing the voice, the speed or a word of the
 * script re-times the whole video instead of leaving it out of step. That was
 * the first thing to break: switching to a slower voice moved every sentence by
 * up to a second, and a hand-timed video would have shown the price falling
 * before anyone said it did.
 *
 * Scene rules:
 *   - a "fade" scene starts a hair (60ms) before its phrase, and the scene
 *     before it runs 0.3s past, so the crossfade has something to cross
 *   - a "cut" scene starts exactly on its phrase — the cut lands on the word
 *   - the video ends `tail` seconds after the last phrase
 */
import { readFileSync, writeFileSync } from 'node:fs';

const CROSSFADE = 0.3;
const FADE_LEAD = 0.06;
const round = (n) => Math.round(n * 1000) / 1000;

const script = JSON.parse(readFileSync('script.json', 'utf8'));
const timings = JSON.parse(readFileSync('timings.json', 'utf8'));

const seg = Object.fromEntries(timings.sentences.map((s) => [s.id, s]));
const last = timings.sentences[timings.sentences.length - 1];
const total = round(last.end + (script.tail ?? 0.9));

// Starts first, then each scene ends where the next begins (plus the overlap
// a crossfade needs).
const starts = script.scenes.map((sc) => {
  if (sc.from === null) return 0;
  const phrase = seg[sc.from];
  if (!phrase) throw new Error(`scene ${sc.id} opens on unknown phrase "${sc.from}"`);
  return round(sc.enter === 'cut' ? phrase.start : phrase.start - FADE_LEAD);
});
const scene = {};
script.scenes.forEach((sc, i) => {
  const next = script.scenes[i + 1];
  const end = next ? starts[i + 1] + (next.enter === 'fade' ? CROSSFADE : 0) : total;
  scene[sc.id] = { start: starts[i], end: round(end), duration: round(end - starts[i]) };
});

// Captions run until the phrase named in `captionsUntil` — the end card says
// its own words in large type and does not need them twice.
const cut = timings.sentences.findIndex((s) => s.id === script.captionsUntil);
const captioned = cut === -1 ? timings.sentences : timings.sentences.slice(0, cut);
const captionsEnd = cut === -1 ? total : scene[script.scenes.find((s) => s.from === script.captionsUntil)?.id]?.start ?? total;

const data = {
  total,
  narration: timings.total,
  seg,
  scene,
  captions: captioned.map((s) => ({ show: s.show, start: s.start, end: s.end })),
};

let html = readFileSync('index.html.tpl', 'utf8');
const values = {
  total,
  narration: timings.total,
  'captions.duration': round(captionsEnd),
};
for (const [id, s] of Object.entries(scene)) {
  values[`${id}.start`] = s.start;
  values[`${id}.duration`] = s.duration;
}

/*
 * The end card's call to action changes with the app's stage — follow now,
 * early access during the closed test, the store link at launch — so it lives
 * in script.json rather than in the template, and switching stages is one line.
 * Escaped: it is text going into HTML.
 */
const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
if (script.endCard) {
  values['endCard.pill'] = escapeHtml(script.endCard.pill ?? '');
  values['endCard.note'] = escapeHtml(script.endCard.note ?? '');
}
html = html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key) => {
  if (!(key in values)) throw new Error(`template asks for unknown value {{${key}}}`);
  return String(values[key]);
});
if (!html.includes('/*TIMINGS*/')) throw new Error('template has no /*TIMINGS*/ marker');
html = html.replace('/*TIMINGS*/ null', JSON.stringify(data));

writeFileSync('index.html', html);
console.log(`index.html — ${total}s`);
for (const [id, s] of Object.entries(scene)) {
  console.log(`  ${id} ${s.start.toFixed(2)} → ${s.end.toFixed(2)}`);
}
