/**
 * Build a day's index.html from its resolved script and measured timings,
 * using the scene library. No per-day template: a day is data.
 *
 * Scene rules (unchanged from the hand-built days):
 *   - a "fade" scene starts a hair (60ms) before its phrase, and the scene
 *     before it runs 0.3s past, so the crossfade has something to cross
 *   - a "cut" scene starts exactly on its phrase — the cut lands on the word
 *   - the video ends `tail` seconds after the last phrase
 *
 * Cues — when an element appears — are written against the narration, never
 * as a hand-typed second, so a re-voiced line re-times the whole video:
 *   "s4"       when phrase s4 starts
 *   "s4@0.5"   halfway through s4 (0 = start, 1 = end)
 *   "s4+0.3"   0.3s after s4 starts   (also "s4@0.5-0.2")
 *   1.2        1.2s after the scene starts
 */
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { CSS, esc, renderCover, renderers } from './scenes.mjs';

const CROSSFADE = 0.3;
const FADE_LEAD = 0.06;
const COVER = 0.4; // the thumbnail holds through the lead-in silence
const r3 = (n) => Math.round(n * 1000) / 1000;

export function sceneTimes(script, timings, total) {
  const seg = Object.fromEntries(timings.sentences.map((s) => [s.id, s]));
  const starts = script.scenes.map((sc, i) => {
    if (i === 0 || sc.from == null) return 0;
    const phrase = seg[sc.from];
    if (!phrase) throw new Error(`scene ${sc.id} opens on unknown phrase "${sc.from}"`);
    return r3(sc.enter === 'cut' ? phrase.start : phrase.start - FADE_LEAD);
  });
  const scene = {};
  script.scenes.forEach((sc, i) => {
    const next = script.scenes[i + 1];
    const end = next ? starts[i + 1] + (next.enter === 'cut' ? 0 : CROSSFADE) : total;
    scene[sc.id] = { start: starts[i], end: r3(end), duration: r3(end - starts[i]) };
  });
  return { seg, scene };
}

export function compose(dir, script, timings, total) {
  const { seg, scene } = sceneTimes(script, timings, total);
  const problems = [];

  // Every image used more than once gets its own copy: the renderer treats two
  // elements pointing at one file as the same media and complains.
  const used = new Map();
  const asset = (file) => {
    if (!file) throw new Error('a scene is missing its "image"');
    const src = path.join(dir, 'assets', file);
    if (!existsSync(src)) throw new Error(`assets/${file} does not exist — fetch it with images.mjs get`);
    const n = (used.get(file) ?? 0) + 1;
    used.set(file, n);
    if (n === 1) return `assets/${file}`;
    const ext = path.extname(file);
    const copy = `${path.basename(file, ext)}--${n}${ext}`;
    copyFileSync(src, path.join(dir, 'assets', copy));
    return `assets/${copy}`;
  };

  const cueFor = (sceneId, S) => (value, fallback) => {
    if (value === undefined || value === null || value === '') return r3(fallback);
    let t;
    if (typeof value === 'number') t = S.start + value;
    else {
      const m = /^([A-Za-z]\w*)(?:@([\d.]+))?([+-][\d.]+)?$/.exec(String(value).trim());
      if (!m) throw new Error(`${sceneId}: cannot read cue "${value}"`);
      const p = seg[m[1]];
      if (!p) throw new Error(`${sceneId}: cue "${value}" names unknown phrase "${m[1]}"`);
      t = p.start + (p.end - p.start) * Number(m[2] ?? 0) + Number(m[3] ?? 0);
    }
    if (t > S.end - 0.35) problems.push(`${sceneId}: cue "${value}" (${t.toFixed(2)}s) is after the scene ends (${S.end.toFixed(2)}s) — it would never be seen`);
    return r3(Math.max(t, S.start));
  };

  const blocks = [];
  const anim = [];
  script.scenes.forEach((sc, i) => {
    const S = scene[sc.id];
    const render = renderers[sc.type];
    if (!render) throw new Error(`${sc.id}: unknown scene type "${sc.type}" (have: ${Object.keys(renderers).join(', ')})`);
    const cue = cueFor(sc.id, S);
    const ctx = {
      id: sc.id,
      S,
      cue,
      asset,
      base: i === 0 ? COVER + 0.05 : S.start + (sc.enter === 'cut' ? 0.03 : 0.15),
      text(field, fallback) {
        if (field === undefined || field === null || field === '') return null;
        if (typeof field === 'string') return { text: field, at: r3(Math.max(fallback, S.start)) };
        return { text: field.text, at: cue(field.at, fallback) };
      },
    };
    const { html, anim: lines } = render(sc, ctx);
    const fadeIn = i > 0 && sc.enter !== 'cut';
    blocks.push(`
      <!-- ${i + 1} ── ${esc(sc.type)}${sc.note ? ` · ${esc(sc.note)}` : ''} -->
      <div id="${sc.id}" class="scene clip" data-start="${S.start}" data-duration="${S.duration}" data-track-index="${i + 1}" style="z-index: ${i + 1}">
        <div id="${sc.id}-in" class="layer">${html}
        </div>
      </div>`);
    if (fadeIn) anim.push(`tl.fromTo("#${sc.id}-in", {"opacity":0}, {"opacity":1,"duration":0.35,"ease":"power1.out"}, ${S.start});`);
    anim.push(...lines);
  });

  // Captions: every phrase before the end card, which says its words in large type.
  const cut = timings.sentences.findIndex((s) => s.id === script.captionsUntil);
  const captioned = cut === -1 ? timings.sentences : timings.sentences.slice(0, cut);
  const endScene = script.scenes.find((s) => s.from === script.captionsUntil);
  const captionsEnd = endScene ? scene[endScene.id].start : total;
  const captions = captioned.map((s) => ({ show: s.show, start: s.start, end: s.end }));
  const highlight = Object.fromEntries((script.highlight ?? []).map((w) => [String(w).toUpperCase(), 1]));

  const cover = script.cover ? renderCover(script.cover, asset, COVER) : '';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <!-- GENERATED by video/tools/make.mjs from script.json — edit that, not this. -->
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>${CSS}</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="1080" data-height="1920">${cover}
${blocks.join('\n')}

      <div id="captions" class="clip" data-start="0" data-duration="${r3(captionsEnd)}" data-track-index="30"></div>
      <audio id="soundtrack" data-start="0" data-duration="${total}" data-track-index="0" src="mix.wav" data-volume="1"></audio>
    </div>

    <script>
      var CAPTIONS = ${JSON.stringify(captions)};
      var KEY = ${JSON.stringify(highlight)};

      // Captions come in balanced chunks of up to four words, split at
      // punctuation first, each timed by its share of the phrase's letters.
      function groupsOf(phrase) {
        var words = phrase.show.split(/\\s+/);
        var parts = [], part = [];
        words.forEach(function (w, i) {
          part.push(w);
          if (/[.,?!;:]$/.test(w) || i === words.length - 1) { parts.push(part); part = []; }
        });
        var groups = [];
        parts.forEach(function (p) {
          var chunks = Math.ceil(p.length / 4), base = Math.floor(p.length / chunks), extra = p.length % chunks, at = 0;
          for (var c = 0; c < chunks; c++) { var size = base + (c < extra ? 1 : 0); groups.push(p.slice(at, at + size)); at += size; }
        });
        var total = groups.reduce(function (n, g) { return n + g.join(" ").length; }, 0);
        var span = phrase.end - phrase.start, t = phrase.start;
        return groups.map(function (g) { var d = (span * g.join(" ").length) / total; var o = { words: g, start: t, end: t + d }; t += d; return o; });
      }
      var GROUPS = [];
      CAPTIONS.forEach(function (p) { GROUPS = GROUPS.concat(groupsOf(p)); });
      var box = document.getElementById("captions");
      GROUPS.forEach(function (g, i) {
        var el = document.createElement("div");
        el.className = "cg";
        el.id = "cg-" + i;
        el.innerHTML = g.words.map(function (w) {
          var bare = w.toUpperCase().replace(/^[“"‘']+/, "").replace(/[.,?!;:’'”"]+$/, "").replace(/(’S|'S)$/, "");
          var safe = w.replace(/&/g, "&amp;").replace(/</g, "&lt;");
          return KEY[bare] || /^\\d{3,4}$/.test(bare) ? '<span class="hl">' + safe + "</span>" : safe;
        }).join(" ");
        box.appendChild(el);
        if (window.__hyperframes && window.__hyperframes.fitTextFontSize) {
          var fit = window.__hyperframes.fitTextFontSize(g.words.join(" ").toUpperCase(), {
            fontFamily: "Anton", fontWeight: 400, maxWidth: 860, baseFontSize: 80, minFontSize: 54,
          });
          el.style.fontSize = fit.fontSize + "px";
        }
      });

      var tl = gsap.timeline({ paused: true });
      ${anim.join('\n      ')}

      GROUPS.forEach(function (g, i) {
        var sel = "#cg-" + i;
        tl.fromTo(sel, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.14, ease: "back.out(1.7)" }, g.start);
        tl.to(sel, { opacity: 0, duration: 0.1, ease: "power2.in" }, g.end - 0.1);
        tl.set(sel, { opacity: 0, visibility: "hidden" }, g.end);
      });

      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
  writeFileSync(path.join(dir, 'index.html'), html);
  return { scene, problems, captionsEnd };
}
