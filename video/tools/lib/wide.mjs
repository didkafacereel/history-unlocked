/**
 * The 16:9 scene library and composer for the long videos (≈5 min, 1920×1080)
 * — make-wide.mjs. Same idea as scenes.mjs/compose.mjs (a video is DATA in
 * script.json, cues are written against the narration), but its own file so
 * the working Shorts pipeline is never touched.
 *
 * Differences from the Shorts:
 *   - 1920×1080, captions in the lower third (one line, word-by-word pop)
 *   - scene text lives top-left, the picture credit top-right
 *   - a "map" scene: an animated schematic battle map (units, arrows, bursts,
 *     tags) whose unit positions carry on from one map scene to the next
 *   - "compare", "timeline" and "number" scenes with counters
 *   - photos that are not 16:9 are laid over a blurred copy of themselves
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { esc, md } from './scenes.mjs';
import { sceneTimes } from './compose.mjs';

const r3 = (n) => Math.round(n * 1000) / 1000;
const W = 1920;
const H = 1080;

// ── CSS ───────────────────────────────────────────────────────────────────
export const CSS = `
@font-face { font-family: "Anton"; src: url("fonts/anton-normal.woff2") format("woff2"); font-weight: 400; font-style: normal; }
@font-face { font-family: "DM Serif Display"; src: url("fonts/dmserif-normal.woff2") format("woff2"); font-weight: 400; font-style: normal; }
@font-face { font-family: "DM Serif Display"; src: url("fonts/dmserif-italic.woff2") format("woff2"); font-weight: 400; font-style: italic; }
:root { --void: #06070a; --ink: #141826; --gold: #f5b73b; --text: #f4f6fb; --text-2: rgba(244, 246, 251, 0.78); --red: #ff3b30; --sky: #4fd1ff; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { margin: 0; overflow: hidden; background: var(--void); }
#root { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: var(--void); color: var(--text); }
.scene { position: absolute; inset: 0; overflow: hidden; }
.layer { position: absolute; inset: 0; }
.solid { background: var(--void); }
.cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.bgblur { filter: blur(30px) brightness(0.5); transform: scale(1.12); }
.fgbox { display: flex; align-items: center; justify-content: center; }
.fgimg { max-width: 1760px; max-height: 960px; display: block; border: 3px solid rgba(244, 246, 251, 0.22); box-shadow: 0 18px 80px rgba(0, 0, 0, 0.7); }
.shade-t { background: linear-gradient(180deg, rgba(6, 7, 10, 0.82) 0%, rgba(6, 7, 10, 0.4) 26%, rgba(6, 7, 10, 0) 46%); }
.shade-l { background: linear-gradient(90deg, rgba(6, 7, 10, 0.9) 0%, rgba(6, 7, 10, 0.62) 40%, rgba(6, 7, 10, 0.12) 78%); }
.dim { background: rgba(6, 7, 10, 0.72); }
.vig { background: radial-gradient(ellipse 80% 80% at 50% 45%, rgba(6, 7, 10, 0) 55%, rgba(6, 7, 10, 0.55) 100%); }
.serif { font-family: "DM Serif Display", serif; font-weight: 400; text-wrap: balance; text-shadow: 0 4px 22px rgba(0, 0, 0, 0.85); }
.italic { font-family: "DM Serif Display", serif; font-style: italic; text-shadow: 0 3px 16px rgba(0, 0, 0, 0.85); }
.hl { color: var(--gold); } .al { color: var(--red); } .ky { color: var(--sky); }
.kick { font-family: "Anton", sans-serif; font-size: 36px; letter-spacing: 0.22em; color: var(--gold); text-transform: uppercase; text-shadow: 0 3px 14px rgba(0, 0, 0, 0.9); }
.tl { position: absolute; left: 96px; top: 44px; max-width: 1180px; display: flex; flex-direction: column; gap: 12px; }
.ln { line-height: 1.04; }
.ft { font-size: 40px; line-height: 1.15; max-width: 1000px; }
.credit { position: absolute; right: 56px; top: 44px; max-width: 760px; text-align: right; font-family: "DM Serif Display", serif; font-style: italic; font-size: 25px; line-height: 1.2; color: var(--text-2); text-shadow: 0 2px 12px rgba(0, 0, 0, 0.95); }
.film { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.rule { width: 360px; height: 4px; background: var(--gold); }

/* title / statement / quote */
.big { position: absolute; left: 110px; top: 250px; max-width: 1300px; display: flex; flex-direction: column; gap: 22px; }
.t-main { font-family: "Anton", sans-serif; line-height: 0.98; text-transform: uppercase; text-shadow: 0 6px 30px rgba(0, 0, 0, 0.85); }
.t-sub { font-size: 54px; color: var(--text-2); line-height: 1.12; max-width: 1100px; }
.s-main { line-height: 1.04; letter-spacing: -0.01em; max-width: 1500px; }
.mid { position: absolute; left: 110px; right: 110px; top: 150px; bottom: 330px; display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.q-mark { font-family: "DM Serif Display", serif; font-size: 240px; line-height: 0.6; color: var(--gold); height: 110px; }
.q-by { font-family: "Anton", sans-serif; font-size: 40px; letter-spacing: 0.12em; color: var(--gold); text-transform: uppercase; }

/* numbers / compare / timeline */
.num-box { position: absolute; left: 110px; top: 190px; display: flex; flex-direction: column; gap: 6px; }
.n-label { font-family: "Anton", sans-serif; font-size: 52px; letter-spacing: 0.1em; text-transform: uppercase; }
.n-counter { font-family: "Anton", sans-serif; line-height: 1.02; color: var(--gold); font-variant-numeric: tabular-nums; white-space: nowrap; text-shadow: 0 8px 40px rgba(0, 0, 0, 0.8); }
.n-sub { font-size: 50px; line-height: 1.12; max-width: 1100px; }
.cmp { position: absolute; left: 110px; right: 110px; top: 150px; display: flex; gap: 40px; align-items: stretch; }
.cmp-col { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.cmp-name { font-family: "Anton", sans-serif; font-size: 62px; letter-spacing: 0.1em; text-transform: uppercase; }
.cmp-val { font-family: "Anton", sans-serif; font-size: 210px; line-height: 1; font-variant-numeric: tabular-nums; text-shadow: 0 8px 40px rgba(0, 0, 0, 0.8); }
.cmp-sub { font-size: 44px; line-height: 1.12; }
.cmp-vs { align-self: center; font-family: "Anton", sans-serif; font-size: 70px; color: var(--text-2); }
.tline { position: absolute; left: 140px; right: 140px; top: 420px; height: 0; }
.tbar { position: absolute; left: 0; right: 0; top: 0; height: 6px; background: var(--gold); transform-origin: 0 50%; }
.titem { position: absolute; top: -150px; width: 480px; }
.ti-year { font-family: "Anton", sans-serif; font-size: 110px; color: var(--gold); line-height: 1; }
.ti-text { font-size: 44px; line-height: 1.12; margin-top: 8px; }
.tdot { position: absolute; top: -17px; width: 40px; height: 40px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 40px rgba(245, 183, 59, 0.7); }

/* map */
.mapsvg { position: absolute; inset: 0; width: ${W}px; height: ${H}px; }
.mh { position: absolute; left: 0; top: 0; opacity: 0; }
.mhead { font-size: 52px; line-height: 1.04; white-space: nowrap; }

/* end card */
.e-box { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 22px; padding-bottom: 130px; }
.e-icon { width: 190px; height: 190px; border-radius: 44px; box-shadow: 0 0 70px rgba(245, 183, 59, 0.35); display: block; }
.e-story { font-size: 72px; line-height: 1.1; max-width: 1400px; }
.e-name { font-family: "Anton", sans-serif; font-size: 110px; letter-spacing: 0.02em; line-height: 1; }
.e-tag { font-size: 48px; color: var(--gold); }
.e-cta { font-family: "Anton", sans-serif; font-size: 60px; letter-spacing: 0.14em; color: var(--void); background: var(--gold); border-radius: 999px; padding: 20px 80px; margin-top: 10px; }
.e-note { font-size: 42px; }
.e-credit { position: absolute; left: 90px; right: 90px; bottom: 30px; text-align: center; font-family: "DM Serif Display", serif; font-size: 22px; line-height: 1.25; color: rgba(244, 246, 251, 0.6); }

/* captions: lower third, one line, word-by-word */
#capshade { position: absolute; left: 0; right: 0; bottom: 0; height: 250px; z-index: 45; pointer-events: none; background: linear-gradient(0deg, rgba(6, 7, 10, 0.78) 0%, rgba(6, 7, 10, 0.4) 55%, rgba(6, 7, 10, 0) 100%); }
#captions { position: absolute; left: 110px; right: 110px; top: 860px; height: 170px; z-index: 50; pointer-events: none; }
.cg { position: absolute; left: 0; right: 0; bottom: 0; text-align: center; font-family: "Anton", sans-serif; font-size: 78px; line-height: 1.16; letter-spacing: 0.01em; text-transform: uppercase; color: #fff; -webkit-text-stroke: 10px #000; paint-order: stroke fill; text-shadow: 0 6px 22px rgba(0, 0, 0, 0.85); opacity: 0; }
.cg .w { display: inline-block; transform-origin: 50% 70%; }
.cg .hl { color: var(--gold); } .cg .al { color: var(--red); } .cg .ky { color: var(--sky); }
.cg .num { color: var(--void); background: var(--gold); -webkit-text-stroke: 0; text-shadow: none; padding: 0 14px; border-radius: 10px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6); }
`;

// ── helpers ───────────────────────────────────────────────────────────────
function animator() {
  const lines = [];
  return {
    lines,
    ft(sel, from, to, t) {
      lines.push(`tl.fromTo(${JSON.stringify(sel)}, ${JSON.stringify(from)}, ${JSON.stringify(to)}, ${r3(t)});`);
    },
    raw(line) {
      lines.push(line);
    },
  };
}

function kenBurns(a, sel, move, S, k = 1) {
  const d = r3(S.end - S.start);
  const z = 0.12 * k;
  const moves = {
    in: [{ scale: 1.0 }, { scale: 1 + z }],
    out: [{ scale: 1 + z * 1.3 }, { scale: 1.0 }],
    left: [{ scale: 1 + z, xPercent: 3 * k }, { scale: 1 + z, xPercent: -3 * k }],
    right: [{ scale: 1 + z, xPercent: -3 * k }, { scale: 1 + z, xPercent: 3 * k }],
    up: [{ scale: 1 + z, yPercent: 3 * k }, { scale: 1 + z, yPercent: -3 * k }],
    down: [{ scale: 1 + z, yPercent: -3 * k }, { scale: 1 + z, yPercent: 3 * k }],
  };
  const [from, to] = moves[move] ?? moves.in;
  a.ft(sel, from, { ...to, duration: d, ease: 'none' }, S.start);
}

const sizeCache = new Map();
function imgSize(file) {
  if (!sizeCache.has(file)) {
    const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' })
      .trim()
      .split(',')
      .map(Number);
    sizeCache.set(file, { w, h });
  }
  return sizeCache.get(file);
}

/** A still: full-bleed when it is wide enough, otherwise laid over a blurred copy of itself. */
function pic(sc, ctx, kbId) {
  const src = ctx.asset(sc.image);
  const { w, h } = imgSize(path.join(ctx.dir, src));
  const fit = sc.fit ?? (w / h >= 1.55 ? 'cover' : 'contain');
  const focus = esc(sc.focus ?? '50% 50%');
  if (fit === 'cover') {
    return `<div id="${kbId}" class="layer" data-layout-allow-overflow><img class="cover" src="${esc(src)}" alt="" style="object-position: ${focus}" /></div>`;
  }
  const src2 = ctx.asset(sc.image);
  // Never blow a small picture up past 1.7× — it only gets soft; the blurred copy fills the rest.
  const k = Math.min(960 / h, 1760 / w, 1.7);
  return `<div class="layer"><img class="cover bgblur" src="${esc(src)}" alt="" /></div>
      <div id="${kbId}" class="layer fgbox" data-layout-allow-overflow><img class="fgimg" src="${esc(src2)}" alt="" style="width: ${Math.round(w * k)}px; height: ${Math.round(h * k)}px" /></div>`;
}
const picK = (sc) => (sc.fit ?? null) === 'cover' ? 1 : 1;
const lineSize = (t) => {
  const n = String(t ?? '').replace(/\*|!!|\+\+/g, '').length;
  return n <= 22 ? 96 : n <= 38 ? 82 : n <= 60 ? 70 : 58;
};
const creditHtml = (sc, id) => (sc.credit ? `<div id="${id}-credit" class="credit">${md(sc.credit)}</div>` : '');
const countJs = (id, from, to, dur, at, { prefix = '', suffix = '', decimals = 0, separator = true } = {}) =>
  `(function () { var o = { v: ${from} }, el = document.getElementById(${JSON.stringify(id)});` +
  ` function show() { var s = o.v.toFixed(${decimals}); ${separator ? 's = s.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");' : ''}` +
  ` el.textContent = ${JSON.stringify(prefix)} + s + ${JSON.stringify(suffix)}; }` +
  ` tl.fromTo(o, { v: ${from} }, { v: ${to}, duration: ${r3(dur)}, ease: "power2.out", onUpdate: show, onComplete: show }, ${r3(at)}); })();`;
const fmtNum = (v, decimals = 0, separator = true) => {
  const s = Number(v).toFixed(decimals);
  return separator ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : s;
};

// ── map geometry ──────────────────────────────────────────────────────────
const pts = (arr) => arr.map((p) => `${p[0]},${p[1]}`).join(' ');
const polyLen = (arr) => arr.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - arr[i][0], p[1] - arr[i][1]), 0);
/** Catmull-Rom → cubic Bézier path through the points (rivers). */
function smoothPath(arr) {
  if (arr.length < 3) return `M ${arr.map((p) => p.join(' ')).join(' L ')}`;
  let d = `M ${arr[0][0]} ${arr[0][1]}`;
  for (let i = 0; i < arr.length - 1; i++) {
    const p0 = arr[i - 1] ?? arr[i];
    const p1 = arr[i];
    const p2 = arr[i + 1];
    const p3 = arr[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// ── scene renderers ───────────────────────────────────────────────────────
export const renderers = {
  photo(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const line = ctx.text(sc.line, S.start + Math.min(0.6, S.duration * 0.15));
    const fact = ctx.text(sc.fact, S.start + S.duration * 0.5);
    const texty = sc.kicker || line || fact;
    const html = `
      <div class="layer solid"></div>
      ${pic(sc, ctx, `${id}-kb`)}
      <div class="layer ${texty ? 'shade-t' : 'vig'}"></div>
      ${texty ? `<div class="tl">
        ${sc.kicker ? `<div id="${id}-kicker" class="kick">${md(sc.kicker)}</div>` : ''}
        ${line ? `<div id="${id}-line" class="serif ln" style="font-size: ${lineSize(line.text)}px">${md(line.text)}</div>` : ''}
        ${fact ? `<div id="${id}-fact" class="italic ft">${md(fact.text)}</div>` : ''}
      </div>` : ''}
      ${creditHtml(sc, id)}`;
    kenBurns(a, `#${id}-kb`, sc.move ?? 'in', S, sc.fit === 'contain' || !sc.fit ? 0.6 : 1);
    if (sc.kicker) a.ft(`#${id}-kicker`, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, ctx.base + 0.1);
    if (line) a.ft(`#${id}-line`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, line.at);
    if (fact) a.ft(`#${id}-fact`, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.6, ease: 'sine.out' }, fact.at);
    if (sc.credit) a.ft(`#${id}-credit`, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'sine.out' }, ctx.base + 0.2);
    return { html, anim: a.lines };
  },

  film(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const src = ctx.asset(sc.clip);
    let problem = null;
    try {
      const len = Number.parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', path.join(ctx.dir, src)], { encoding: 'utf8' }).trim());
      if (len < S.duration - 0.05) problem = `${id}: film ${sc.clip} is ${len.toFixed(2)}s but the scene is on screen ${S.duration.toFixed(2)}s — cut a longer shot`;
    } catch {
      problem = `${id}: cannot read ${src}`;
    }
    if (!sc.credit) problem ??= `${id}: a film scene needs "credit" — what the footage is, and "illustrative" if it is not the event itself`;
    const line = ctx.text(sc.line, S.start + 0.5);
    const html = `
      ${sc.kicker || line ? `<div class="layer shade-t"></div><div class="tl">
        ${sc.kicker ? `<div id="${id}-kicker" class="kick">${md(sc.kicker)}</div>` : ''}
        ${line ? `<div id="${id}-line" class="serif ln" style="font-size: ${lineSize(line.text)}px">${md(line.text)}</div>` : ''}
      </div>` : ''}
      <div id="${id}-credit" class="credit">${md(sc.credit ?? '')}</div>`;
    if (sc.kicker) a.ft(`#${id}-kicker`, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, ctx.base + 0.1);
    if (line) a.ft(`#${id}-line`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, line.at);
    a.ft(`#${id}-credit`, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'sine.out' }, ctx.base + 0.2);
    return { html, anim: a.lines, media: src, problem };
  },

  title(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const b = ctx.base;
    const main = String(sc.title ?? '');
    const px = main.length <= 10 ? 250 : main.length <= 16 ? 200 : main.length <= 24 ? 150 : 118;
    const html = `
      <div class="layer solid"></div>
      ${pic(sc, ctx, `${id}-kb`)}
      <div class="layer shade-l"></div>
      <div class="big">
        <div id="${id}-kicker" class="kick">${md(sc.kicker ?? '')}</div>
        <div id="${id}-main" class="t-main" style="font-size: ${px}px">${md(main)}</div>
        <div id="${id}-rule" class="rule"></div>
        ${sc.sub ? `<div id="${id}-sub" class="italic t-sub">${md(sc.sub)}</div>` : ''}
      </div>
      ${creditHtml(sc, id)}`;
    kenBurns(a, `#${id}-kb`, sc.move ?? 'out', S, 0.7);
    a.ft(`#${id}-kicker`, { opacity: 0, x: -50 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' }, b);
    a.ft(`#${id}-main`, { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'expo.out', transformOrigin: '0% 50%' }, b + 0.15);
    a.ft(`#${id}-rule`, { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power4.out', transformOrigin: '0% 50%' }, b + 0.6);
    if (sc.sub) a.ft(`#${id}-sub`, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, b + 0.9);
    if (sc.credit) a.ft(`#${id}-credit`, { opacity: 0 }, { opacity: 1, duration: 0.5 }, b + 0.3);
    return { html, anim: a.lines };
  },

  statement(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const main = ctx.text(sc.main, S.start + Math.min(0.7, S.duration * 0.15));
    const n = main.text.replace(/\*|!!|\+\+/g, '').length;
    const px = n <= 16 ? 170 : n <= 30 ? 130 : n <= 50 ? 104 : 84;
    const html = `
      <div class="layer solid"></div>
      ${sc.image ? `${pic(sc, ctx, `${id}-kb`)}<div class="layer dim"></div>` : ''}
      <div class="mid">
        ${sc.kicker ? `<div id="${id}-kicker" class="kick">${md(sc.kicker)}</div>` : ''}
        <div id="${id}-main" class="serif s-main" style="font-size: ${px}px">${md(main.text)}</div>
        ${sc.fact ? `<div id="${id}-fact" class="italic ft">${md(typeof sc.fact === 'string' ? sc.fact : sc.fact.text)}</div>` : ''}
      </div>
      ${creditHtml(sc, id)}`;
    if (sc.image) kenBurns(a, `#${id}-kb`, sc.move ?? 'in', S, 0.6);
    if (sc.kicker) a.ft(`#${id}-kicker`, { opacity: 0 }, { opacity: 1, duration: 0.3 }, ctx.base + 0.05);
    a.ft(`#${id}-main`, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, main.at);
    if (sc.fact) {
      const f = ctx.text(sc.fact, S.start + S.duration * 0.55);
      a.ft(`#${id}-fact`, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.6, ease: 'sine.out' }, f.at);
    }
    if (sc.credit) a.ft(`#${id}-credit`, { opacity: 0 }, { opacity: 1, duration: 0.5 }, ctx.base + 0.2);
    return { html, anim: a.lines };
  },

  quote(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const q = ctx.text(sc.quote, S.start + 0.6);
    const by = ctx.text(sc.by, S.start + S.duration * 0.55);
    const n = q.text.length;
    const px = n <= 50 ? 96 : n <= 90 ? 80 : n <= 140 ? 68 : 58;
    const html = `
      <div class="layer solid"></div>
      ${sc.image ? `${pic(sc, ctx, `${id}-kb`)}<div class="layer dim"></div>` : ''}
      <div class="mid">
        <div id="${id}-mark" class="q-mark">“</div>
        <div id="${id}-quote" class="italic" style="font-size: ${px}px; line-height: 1.1; max-width: 1500px">${md(q.text)}</div>
        ${by ? `<div id="${id}-by" class="q-by">${md(by.text)}</div>` : ''}
      </div>
      ${creditHtml(sc, id)}`;
    if (sc.image) kenBurns(a, `#${id}-kb`, sc.move ?? 'in', S, 0.6);
    a.ft(`#${id}-mark`, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)', transformOrigin: '0% 50%' }, ctx.base + 0.1);
    a.ft(`#${id}-quote`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, q.at);
    if (by) a.ft(`#${id}-by`, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.5, ease: 'sine.out' }, by.at);
    if (sc.credit) a.ft(`#${id}-credit`, { opacity: 0 }, { opacity: 1, duration: 0.5 }, ctx.base + 0.2);
    return { html, anim: a.lines };
  },

  number(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const value = Number(sc.value);
    if (!Number.isFinite(value)) throw new Error(`${id}: number scene needs a numeric "value"`);
    const opts = { prefix: sc.prefix ?? '', suffix: sc.suffix ?? '', decimals: sc.decimals ?? 0, separator: sc.separator !== false };
    const final = `${opts.prefix}${fmtNum(value, opts.decimals, opts.separator)}${opts.suffix}`;
    const px = final.length <= 3 ? 420 : final.length <= 5 ? 330 : final.length <= 7 ? 260 : final.length <= 9 ? 200 : 160;
    const count = sc.count ?? {};
    const from = ctx.cue(count.from, S.start + Math.min(0.8, S.duration * 0.12));
    const to = Math.max(from + 0.6, ctx.cue(count.to, from + Math.min(2.4, S.duration * 0.4)));
    const sub = ctx.text(sc.sub, to + 0.3);
    const html = `
      <div class="layer solid"></div>
      ${sc.image ? `${pic(sc, ctx, `${id}-kb`)}<div class="layer shade-l"></div>` : ''}
      <div class="num-box">
        ${sc.label ? `<div id="${id}-label" class="n-label" style="color: ${esc(sc.color ?? '#f4f6fb')}">${md(sc.label)}</div>` : ''}
        <div id="${id}-counter" class="n-counter" style="font-size: ${px}px">${esc(`${opts.prefix}${fmtNum(sc.start ?? 0, opts.decimals, opts.separator)}${opts.suffix}`)}</div>
        ${sub ? `<div id="${id}-sub" class="italic n-sub">${md(sub.text)}</div>` : ''}
      </div>
      ${creditHtml(sc, id)}`;
    if (sc.image) kenBurns(a, `#${id}-kb`, sc.move ?? 'out', S, 0.6);
    if (sc.label) a.ft(`#${id}-label`, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out' }, ctx.base + 0.1);
    a.ft(`#${id}-counter`, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)', transformOrigin: '0% 50%' }, ctx.base + 0.2);
    a.raw(countJs(`${id}-counter`, Number(sc.start ?? 0), value, to - from, from, opts));
    if (sub) a.ft(`#${id}-sub`, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'sine.out' }, sub.at);
    if (sc.credit) a.ft(`#${id}-credit`, { opacity: 0 }, { opacity: 1, duration: 0.5 }, ctx.base + 0.2);
    return { html, anim: a.lines };
  },

  /** Two sides, two counting numbers: ROME 86,000 vs CARTHAGE 50,000. */
  compare(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const col = (k, c) => {
      const opts = { prefix: c.prefix ?? '', suffix: c.suffix ?? '', decimals: 0, separator: true };
      const final = `${opts.prefix}${fmtNum(c.value)}${opts.suffix}`;
      return { opts, final, html: `
        <div id="${id}-col-${k}" class="cmp-col">
          <div class="cmp-name" style="color: ${esc(c.color ?? '#f4f6fb')}">${md(c.name)}</div>
          <div id="${id}-val-${k}" class="cmp-val" style="color: ${esc(c.color ?? '#f4f6fb')}; font-size: ${final.length <= 6 ? 230 : 190}px">0</div>
          ${c.sub ? `<div class="italic cmp-sub">${md(c.sub)}</div>` : ''}
        </div>` };
    };
    const L = col('a', sc.a);
    const R = col('b', sc.b);
    const html = `
      <div class="layer solid"></div>
      ${sc.image ? `${pic(sc, ctx, `${id}-kb`)}<div class="layer dim"></div>` : ''}
      <div class="cmp">${L.html}<div class="cmp-vs">VS</div>${R.html}</div>
      ${creditHtml(sc, id)}`;
    if (sc.image) kenBurns(a, `#${id}-kb`, sc.move ?? 'in', S, 0.6);
    const t0 = ctx.cue(sc.a.at, S.start + 0.5);
    const t1 = ctx.cue(sc.b.at, S.start + Math.min(S.duration * 0.5, 3));
    a.ft(`#${id}-col-a`, { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' }, t0);
    a.ft(`#${id}-col-b`, { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' }, t1);
    a.raw(countJs(`${id}-val-a`, 0, sc.a.value, 1.8, t0 + 0.2, L.opts));
    a.raw(countJs(`${id}-val-b`, 0, sc.b.value, 1.8, t1 + 0.2, R.opts));
    return { html, anim: a.lines };
  },

  /** A line of dated beats that draws left to right: 218 BC → 217 BC → 216 BC. */
  timeline(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const items = (sc.items ?? []).slice(0, 5);
    if (!items.length) throw new Error(`${id}: timeline needs items`);
    const span = W - 280;
    const slot = items.length > 1 ? (span - 480) / (items.length - 1) : 0;
    const html = `
      <div class="layer solid"></div>
      ${sc.image ? `${pic(sc, ctx, `${id}-kb`)}<div class="layer dim"></div>` : ''}
      ${sc.kicker ? `<div class="tl"><div id="${id}-kicker" class="kick">${md(sc.kicker)}</div></div>` : ''}
      <div class="tline"><div id="${id}-bar" class="tbar"></div>
        ${items.map((it, i) => `<div id="${id}-d${i}" class="tdot" style="left: ${Math.round(i * slot) - 4}px"></div>
        <div id="${id}-i${i}" class="titem" style="left: ${Math.round(i * slot)}px"><div class="ti-year">${md(String(it.year))}</div><div class="serif ti-text">${md(it.text)}</div></div>`).join('')}
      </div>
      ${creditHtml(sc, id)}`;
    if (sc.image) kenBurns(a, `#${id}-kb`, sc.move ?? 'in', S, 0.5);
    if (sc.kicker) a.ft(`#${id}-kicker`, { opacity: 0 }, { opacity: 1, duration: 0.4 }, ctx.base);
    a.ft(`#${id}-bar`, { scaleX: 0 }, { scaleX: 1, duration: r3(Math.max(1.2, S.duration * 0.7)), ease: 'power1.inOut' }, ctx.base + 0.1);
    items.forEach((it, i) => {
      const at = ctx.cue(it.at, S.start + 0.5 + (S.duration * 0.6 * i) / Math.max(1, items.length));
      a.ft(`#${id}-d${i}`, { scale: 0 }, { scale: 1, duration: 0.35, ease: 'back.out(2.4)' }, at);
      a.ft(`#${id}-i${i}`, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }, at + 0.1);
    });
    if (sc.credit) a.ft(`#${id}-credit`, { opacity: 0 }, { opacity: 1, duration: 0.5 }, ctx.base + 0.2);
    return { html, anim: a.lines };
  },

  /**
   * The animated schematic battle map. script.maps[sc.map] holds the terrain
   * and the units; the scene holds the choreography (steps, heads, tags).
   * Unit positions carry on from the previous scene of the same map.
   *
   * steps: [{ at, dur, ease, move: { unit: { x, y, rot, sx, sy } }, show: [unit], hide: [unit],
   *           arrows: [{ id, points: [[x,y]…], color, width, at, dur }],
   *           bursts: [{ x, y, color, at }] }]
   * heads: [{ at, text }]          the headline top-left, replaced at each cue
   * tags:  [{ at, until, x, y, text, color, size, anchor, to: [x, y] }]   labels on the map
   */
  map(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const def = ctx.maps?.[sc.map];
    if (!def) throw new Error(`${id}: unknown map "${sc.map}" (script.maps)`);
    const T = def.terrain ?? {};
    const state = (ctx.mapState[sc.map] ??= Object.fromEntries(def.units.map((u) => [u.id, { x: u.x, y: u.y, rot: u.rot ?? 0, sx: 1, sy: 1, o: u.visible ? 1 : 0 }])));
    const col = { rome: '#d9382e', carth: '#2fb4e0', ally: '#ee7b6e', libya: '#1f86a8', num: '#8fe0f5' };
    const unitSvg = (u) => {
      const w = u.w ?? 120;
      const h = u.h ?? 80;
      const c = esc(u.color ?? col[u.side] ?? '#fff');
      const pat = u.kind === 'cav' ? `${id}-stripes` : `${id}-dots`;
      return `<g id="${id}-u-${u.id}" opacity="0">
        <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="7" fill="${c}" fill-opacity="0.92" stroke="#fff" stroke-opacity="0.55" stroke-width="2.5"/>
        <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="7" fill="url(#${pat})"/>
        ${u.label ? `<text x="0" y="${Math.min(h / 2 - 8, 9)}" text-anchor="middle" font-family="Anton" font-size="${u.fs ?? 24}" letter-spacing="1.5" fill="#fff" stroke="#000" stroke-opacity="0.65" stroke-width="5" paint-order="stroke">${esc(u.label)}</text>` : ''}
      </g>`;
    };
    // The terrain: dark slate land, contour hills, a river, farmland, camps, labels.
    const hills = (T.hills ?? []).map((h) => [1, 0.72, 0.46].map((k, i) => `<ellipse cx="${h.cx}" cy="${h.cy}" rx="${h.rx * k}" ry="${h.ry * k}" fill="${i === 2 ? 'rgba(120,140,170,0.16)' : 'none'}" stroke="rgba(150,170,200,${0.34 - i * 0.08})" stroke-width="2"/>`).join('')).join('');
    const rivers = (T.rivers ?? []).map((r) => `<path d="${smoothPath(r.points)}" fill="none" stroke="#1b4f86" stroke-width="${(r.width ?? 40) + 14}" stroke-linecap="round" stroke-opacity="0.55"/>
      <path d="${smoothPath(r.points)}" fill="none" stroke="#3a86d0" stroke-width="${r.width ?? 40}" stroke-linecap="round"/>
      <path d="${smoothPath(r.points)}" fill="none" stroke="#8cc4f0" stroke-width="3" stroke-linecap="round" stroke-opacity="0.5" stroke-dasharray="3 22"/>`).join('');
    const areas = (T.areas ?? []).map((r) => `<polygon points="${pts(r.points)}" fill="${esc(r.fill ?? 'rgba(255,255,255,0.05)')}" stroke="${esc(r.stroke ?? 'rgba(255,255,255,0.18)')}" stroke-width="2" ${r.dash ? 'stroke-dasharray="14 10"' : ''}/>`).join('');
    const labels = (T.labels ?? []).map((l) => `<text x="${l.x}" y="${l.y}" ${l.rot ? `transform="rotate(${l.rot} ${l.x} ${l.y})"` : ''} text-anchor="${l.anchor ?? 'middle'}" font-family="${l.serif === false ? 'Anton' : 'DM Serif Display'}" ${l.serif === false ? '' : 'font-style="italic"'} font-size="${l.size ?? 30}" letter-spacing="${l.serif === false ? 4 : 1}" fill="${esc(l.color ?? 'rgba(244,246,251,0.55)')}">${esc(l.text)}</text>`).join('');
    const arrows = [];
    const bursts = [];
    const stepsOut = [];

    // Initial state of every unit at the start of this scene.
    for (const u of def.units) {
      const s = state[u.id];
      a.raw(`tl.set(${JSON.stringify(`#${id}-u-${u.id}`)}, { x: ${s.x}, y: ${s.y}, rotation: ${s.rot}, scaleX: ${s.sx}, scaleY: ${s.sy}, opacity: ${s.o} }, 0);`);
    }
    (sc.steps ?? []).forEach((st, si) => {
      const at = ctx.cue(st.at, S.start + 0.5);
      const dur = st.dur ?? 1.6;
      const ease = st.ease ?? 'power2.inOut';
      for (const uid of st.show ?? []) {
        const s = state[uid];
        if (!s) throw new Error(`${id}: step ${si} shows unknown unit "${uid}"`);
        a.ft(`#${id}-u-${uid}`, { opacity: s.o }, { opacity: 1, duration: st.showDur ?? 0.5, ease: 'power2.out', immediateRender: false }, at);
        s.o = 1;
      }
      for (const [uid, to] of Object.entries(st.move ?? {})) {
        const s = state[uid];
        if (!s) throw new Error(`${id}: step ${si} moves unknown unit "${uid}"`);
        const next = { x: to.x ?? s.x, y: to.y ?? s.y, rot: to.rot ?? s.rot, sx: to.sx ?? s.sx, sy: to.sy ?? s.sy };
        a.ft(`#${id}-u-${uid}`, { x: s.x, y: s.y, rotation: s.rot, scaleX: s.sx, scaleY: s.sy }, { x: next.x, y: next.y, rotation: next.rot, scaleX: next.sx, scaleY: next.sy, duration: to.dur ?? dur, ease: to.ease ?? ease, immediateRender: false }, ctx.cue(to.at, at));
        Object.assign(s, next);
      }
      for (const uid of st.hide ?? []) {
        const s = state[uid];
        a.ft(`#${id}-u-${uid}`, { opacity: s.o }, { opacity: 0, duration: st.hideDur ?? 0.8, ease: 'power2.in', immediateRender: false }, at + (st.hideAfter ?? 0));
        s.o = 0;
      }
      (st.arrows ?? []).forEach((ar, ai) => {
        const aid = `${id}-a${si}-${ai}`;
        const L = polyLen(ar.points);
        const c = esc(ar.color ?? '#ffffff');
        const e = ar.points[ar.points.length - 1];
        const q = ar.points[ar.points.length - 2];
        const ang = (Math.atan2(e[1] - q[1], e[0] - q[0]) * 180) / Math.PI;
        const w = ar.width ?? 12;
        const aAt = ctx.cue(ar.at, at);
        const aDur = ar.dur ?? Math.max(0.8, Math.min(2.4, L / 380));
        arrows.push(`<polyline id="${aid}" points="${pts(ar.points)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.95" stroke-dasharray="${L.toFixed(1)} ${L.toFixed(1)}" stroke-dashoffset="${L.toFixed(1)}"/>
          <polygon id="${aid}-h" transform="translate(${e[0]} ${e[1]}) rotate(${r3(ang)})" points="${-w * 1.2},${-w * 1.5} ${w * 2.4},0 ${-w * 1.2},${w * 1.5}" fill="${c}" opacity="0"/>`);
        a.ft(`#${aid}`, { strokeDashoffset: L }, { strokeDashoffset: 0, duration: aDur, ease: 'power1.inOut', immediateRender: false }, aAt);
        a.ft(`#${aid}-h`, { opacity: 0 }, { opacity: 1, duration: 0.2, immediateRender: false }, aAt + aDur - 0.15);
        if (ar.until != null) {
          const u = ctx.cue(ar.until, aAt + aDur + 1.5);
          a.ft(`#${aid}`, { opacity: 1 }, { opacity: 0, duration: 0.6, immediateRender: false }, u);
          a.ft(`#${aid}-h`, { opacity: 1 }, { opacity: 0, duration: 0.6, immediateRender: false }, u);
        }
      });
      (st.bursts ?? []).forEach((bu, bi) => {
        const bid = `${id}-b${si}-${bi}`;
        const bc = esc(bu.color ?? '#ffd45a');
        bursts.push(`<circle id="${bid}" cx="${bu.x}" cy="${bu.y}" r="${bu.r ?? 46}" fill="none" stroke="${bc}" stroke-width="7" opacity="0"/>`);
        a.ft(`#${bid}`, { opacity: 0.95, scale: 0.35, svgOrigin: `${bu.x} ${bu.y}` }, { opacity: 0, scale: 3.1, svgOrigin: `${bu.x} ${bu.y}`, duration: bu.dur ?? 1.0, ease: 'power2.out', immediateRender: false }, ctx.cue(bu.at, at));
      });
      stepsOut.push(si);
    });

    // Tags — labels (with an optional leader line) that appear on the map.
    const tagSvg = (sc.tags ?? []).map((t, i) => {
      const tid = `${id}-t${i}`;
      const anchor = t.anchor ?? 'middle';
      const c = esc(t.color ?? '#f4f6fb');
      const fs = t.size ?? 34;
      const leader = t.to ? `<line x1="${t.x}" y1="${t.y}" x2="${t.to[0]}" y2="${t.to[1]}" stroke="${c}" stroke-width="3" stroke-opacity="0.85"/><circle cx="${t.to[0]}" cy="${t.to[1]}" r="7" fill="${c}"/>` : '';
      const lines = String(t.text).split('\n');
      const txt = lines.map((ln, k) => `<text x="${t.x}" y="${t.y + k * Math.round(fs * 1.3)}" text-anchor="${anchor}" font-family="Anton" font-size="${fs}" letter-spacing="2.5" fill="${c}" stroke="#000" stroke-opacity="0.85" stroke-width="9" paint-order="stroke">${esc(ln)}</text>`).join('');
      const at = ctx.cue(t.at, S.start + 0.5);
      a.ft(`#${tid}`, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out', immediateRender: false }, at);
      if (t.until != null) a.ft(`#${tid}`, { opacity: 1 }, { opacity: 0, duration: 0.45, ease: 'power2.in', immediateRender: false }, ctx.cue(t.until, at + 3));
      return `<g id="${tid}" opacity="0">${leader}${txt}</g>`;
    }).join('');

    // Heads — the top-left headline, replaced at each cue.
    const heads = sc.heads ?? [];
    const headHtml = heads.map((h, i) => `<div id="${id}-h${i}" class="mh serif mhead">${md(h.text)}</div>`).join('');
    heads.forEach((h, i) => {
      const at = ctx.cue(h.at, S.start + 0.4);
      a.ft(`#${id}-h${i}`, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', immediateRender: false }, at);
      const next = heads[i + 1];
      if (next) a.ft(`#${id}-h${i}`, { opacity: 1 }, { opacity: 0, duration: 0.35, ease: 'power2.in', immediateRender: false }, ctx.cue(next.at, at + 3) - 0.1);
    });
    a.ft(`#${id}-cam`, { scale: def.zoom?.[0] ?? 1.0, svgOrigin: '960 520' }, { scale: def.zoom?.[1] ?? 1.05, duration: r3(S.duration), ease: 'none', svgOrigin: '960 520' }, S.start);
    if (sc.kicker) a.ft(`#${id}-kicker`, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, ctx.base + 0.1);

    const legend = def.legend
      ? `<g transform="translate(1500 110)" font-family="DM Serif Display" font-style="italic" font-size="26" fill="rgba(244,246,251,0.92)">
          ${def.legend.map((l, i) => `<rect x="0" y="${i * 40}" width="34" height="24" rx="4" fill="${esc(l.color)}" ${l.cav ? `/><rect x="0" y="${i * 40}" width="34" height="24" rx="4" fill="url(#${id}-stripes)"` : ''}/><text x="48" y="${i * 40 + 20}">${esc(l.text)}</text>`).join('')}
        </g>`
      : '';
    const html = `
      <div class="layer solid"></div>
      <svg class="mapsvg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" data-layout-allow-overflow>
        <defs>
          <pattern id="${id}-dots" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1.8" fill="rgba(255,255,255,0.5)"/></pattern>
          <pattern id="${id}-stripes" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="14" fill="rgba(255,255,255,0.42)"/></pattern>
          <pattern id="${id}-grid" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M120 0H0V120" fill="none" stroke="rgba(255,255,255,0.045)" stroke-width="2"/></pattern>
          <pattern id="${id}-field" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><rect width="9" height="26" fill="rgba(120,150,90,0.08)"/></pattern>
          <radialGradient id="${id}-land" cx="50%" cy="46%" r="75%"><stop offset="0" stop-color="${esc(T.land1 ?? '#222b3a')}"/><stop offset="1" stop-color="${esc(T.land2 ?? '#10151e')}"/></radialGradient>
        </defs>
        <g id="${id}-cam" data-layout-allow-overflow>
          <rect x="-80" y="-60" width="${W + 160}" height="${H + 120}" fill="url(#${id}-land)"/>
          <rect x="-80" y="-60" width="${W + 160}" height="${H + 120}" fill="url(#${id}-field)"/>
          <rect x="-80" y="-60" width="${W + 160}" height="${H + 120}" fill="url(#${id}-grid)"/>
          <g transform="translate(0 ${def.shift?.[1] ?? 0})">
          ${areas}${hills}${rivers}${labels}
          ${arrows.join('')}
          ${def.units.map(unitSvg).join('')}
          ${bursts.join('')}
          ${tagSvg}
          </g>
        </g>
        ${legend}
        <text x="96" y="${H - 262}" text-anchor="start" font-family="DM Serif Display" font-style="italic" font-size="24" fill="rgba(244,246,251,0.95)">schematic — positions approximate; ancient sources differ</text>
      </svg>
      <div class="layer vig"></div>
      <div class="tl">
        ${sc.kicker ? `<div id="${id}-kicker" class="kick">${md(sc.kicker)}</div>` : ''}
        <div style="position: relative; width: 1200px; height: 62px">${headHtml}</div>
      </div>`;
    // keep the end state for the next scene of this map
    ctx.mapState[sc.map] = state;
    return { html, anim: a.lines };
  },

  endcard(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const e = sc.card;
    const storyAt = ctx.cue(sc.storyAt, S.start + 0.1);
    const ctaAt = ctx.cue(sc.ctaAt, S.start + S.duration * 0.4);
    const html = `
      <div class="layer solid"></div>
      ${sc.image ? `<div class="layer" style="opacity: 0.16"><img class="cover" src="${esc(ctx.asset(sc.image))}" alt="" /></div>` : ''}
      <div id="${id}-content" class="e-box">
        <img id="${id}-icon" class="e-icon" src="assets/icon.png" alt="" />
        <div id="${id}-story" class="serif e-story">${md(e.story)}</div>
        <div id="${id}-name" class="e-name">${md(e.name)}</div>
        <div id="${id}-tag" class="italic e-tag">${md(e.tag)}</div>
        <div id="${id}-cta" class="e-cta">${md(e.pill)}</div>
        <div id="${id}-note" class="italic e-note">${md(e.note)}</div>
      </div>
      <div id="${id}-credit" class="e-credit">${esc(sc.credits)}</div>`;
    a.ft(`#${id}-icon`, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.8)' }, S.start + 0.15);
    a.ft(`#${id}-story`, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, storyAt);
    a.ft(`#${id}-name`, { opacity: 0, scale: 1.2 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'expo.out' }, ctaAt - 0.5);
    a.ft(`#${id}-tag`, { opacity: 0 }, { opacity: 1, duration: 0.6 }, ctaAt - 0.2);
    a.ft(`#${id}-cta`, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, ctaAt);
    a.ft(`#${id}-cta`, { scale: 1 }, { scale: 1.07, duration: 0.45, ease: 'sine.inOut', yoyo: true, repeat: 3, immediateRender: false }, ctaAt + 0.55);
    a.ft(`#${id}-note`, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 }, ctaAt + 0.8);
    a.ft(`#${id}-credit`, { opacity: 0 }, { opacity: 1, duration: 0.5 }, ctaAt - 0.4);
    a.ft(`#${id}-content`, { opacity: 1 }, { opacity: 0, duration: 0.4, ease: 'power2.in' }, S.end - 0.45);
    return { html, anim: a.lines };
  },
};

// ── composer ──────────────────────────────────────────────────────────────
const FADE_LEAD = 0.06;
void FADE_LEAD;
export function composeWide(dir, script, timings, total) {
  const { seg, scene } = sceneTimes(script, timings, total);
  const problems = [];
  const used = new Map();
  const asset = (name) => {
    if (!name) throw new Error('a scene is missing its "image"');
    const file = path.extname(name) ? name : `${name}.jpg`; // images may be named without ".jpg"
    const src = path.join(dir, 'assets', file);
    if (!existsSync(src)) throw new Error(`assets/${file} does not exist`);
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
      const p = m && seg[m[1]];
      if (!p) throw new Error(`${sceneId}: cannot read cue "${value}" (unknown phrase?)`);
      t = p.start + (p.end - p.start) * Number(m[2] ?? 0) + Number(m[3] ?? 0);
    }
    if (t > S.end - 0.3) problems.push(`${sceneId}: cue "${value}" (${t.toFixed(2)}s) is after the scene ends (${S.end.toFixed(2)}s)`);
    return r3(Math.max(t, S.start));
  };

  const blocks = [];
  const anim = [];
  const mapState = {};
  script.scenes.forEach((sc, i) => {
    const S = scene[sc.id];
    const render = renderers[sc.type];
    if (!render) throw new Error(`${sc.id}: unknown scene type "${sc.type}" (have: ${Object.keys(renderers).join(', ')})`);
    const cue = cueFor(sc.id, S);
    const ctx = {
      id: sc.id, dir, S, cue, asset, maps: script.maps, mapState,
      base: i === 0 ? 0.45 : S.start + (sc.enter === 'cut' ? 0.03 : 0.15),
      text(field, fallback) {
        if (field === undefined || field === null || field === '') return null;
        if (typeof field === 'string') return { text: field, at: r3(Math.max(fallback, S.start)) };
        return { text: field.text, at: cue(field.at, fallback) };
      },
    };
    const { html, anim: lines, media, problem } = render(sc, ctx);
    if (problem) problems.push(problem);
    const fadeIn = i > 0 && sc.enter !== 'cut';
    if (media) {
      blocks.push(`
      <video id="${sc.id}-film" class="clip film" src="${media}" data-start="${S.start}" data-duration="${S.duration}" data-track-index="${i + 1}" style="z-index: ${i + 1}" muted playsinline></video>`);
      if (fadeIn) anim.push(`tl.fromTo("#${sc.id}-film", {"opacity":0}, {"opacity":1,"duration":0.35,"ease":"power1.out"}, ${S.start});`);
    }
    blocks.push(`
      <!-- ${i + 1} ── ${esc(sc.type)}${sc.note ? ` · ${esc(sc.note)}` : ''} -->
      <div id="${sc.id}" class="scene clip" data-start="${S.start}" data-duration="${S.duration}" data-track-index="${i + 1}" style="z-index: ${i + 1}">
        <div id="${sc.id}-in" class="layer">${html}
        </div>
      </div>`);
    if (fadeIn) anim.push(`tl.fromTo("#${sc.id}-in", {"opacity":0}, {"opacity":1,"duration":0.35,"ease":"power1.out"}, ${S.start});`);
    anim.push(...lines);
  });

  const cut = timings.sentences.findIndex((s) => s.id === script.captionsUntil);
  const captioned = cut === -1 ? timings.sentences : timings.sentences.slice(0, cut);
  const endScene = script.scenes.find((s) => s.from === script.captionsUntil);
  const captionsEnd = endScene ? scene[endScene.id].start : total;
  const captions = captioned.map((s) => ({ show: s.show, start: s.start, end: s.end }));
  const highlight = Object.fromEntries([
    ...(script.highlight ?? []).map((w) => [String(w).toUpperCase(), 'hl']),
    ...(script.alert ?? []).map((w) => [String(w).toUpperCase(), 'al']),
    ...(script.names ?? []).map((w) => [String(w).toUpperCase(), 'ky']),
  ]);

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <!-- GENERATED by video/tools/make-wide.mjs from script.json — edit that, not this. -->
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>${CSS}</style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}">
${blocks.join('\n')}

      <div id="capshade" class="clip" data-start="0" data-duration="${r3(captionsEnd)}" data-track-index="29"></div>
      <div id="captions" class="clip" data-start="0" data-duration="${r3(captionsEnd)}" data-track-index="30"></div>
      <audio id="soundtrack" data-start="0" data-duration="${total}" data-track-index="0" src="mix.wav" data-volume="1"></audio>
    </div>

    <script>
      var CAPTIONS = ${JSON.stringify(captions)};
      var KEY = ${JSON.stringify(highlight)};
      var MAXW = 5;

      function groupsOf(phrase) {
        var words = phrase.show.split(/\\s+/);
        var parts = [], part = [];
        words.forEach(function (w, i) {
          part.push(w);
          if (/[.,?!;:]$/.test(w) || i === words.length - 1) { parts.push(part); part = []; }
        });
        var groups = [];
        parts.forEach(function (p) {
          var chunks = Math.ceil(p.length / MAXW), base = Math.floor(p.length / chunks), extra = p.length % chunks, at = 0;
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
        el.innerHTML = g.words.map(function (w, k) {
          var bare = w.toUpperCase().replace(/^[“"‘']+/, "").replace(/[.,?!;:’'”"]+$/, "").replace(/(’S|'S)$/, "");
          var safe = w.replace(/&/g, "&amp;").replace(/</g, "&lt;");
          var cls = KEY[bare] || KEY[w.toUpperCase()] || (/^[$~]?[\\d,.:]+(%|\\+|KM|KG)?$/.test(bare) && /\\d/.test(bare) ? "num" : "");
          return '<span class="w ' + cls + '" id="cg-' + i + '-' + k + '">' + safe + "</span>";
        }).join(" ");
        box.appendChild(el);
        if (window.__hyperframes && window.__hyperframes.fitTextFontSize) {
          var fit = window.__hyperframes.fitTextFontSize(g.words.join(" ").toUpperCase(), {
            fontFamily: "Anton", fontWeight: 400, maxWidth: 1650, baseFontSize: 78, minFontSize: 50,
          });
          el.style.fontSize = fit.fontSize + "px";
        }
      });

      var tl = gsap.timeline({ paused: true });
      ${anim.join('\n      ')}

      GROUPS.forEach(function (g, i) {
        var sel = "#cg-" + i;
        tl.set(sel, { opacity: 1, visibility: "visible" }, g.start);
        var step = Math.min(0.2, (g.end - g.start) / (g.words.length + 0.5));
        g.words.forEach(function (w, k) {
          var ws = sel + "-" + k, em = document.getElementById("cg-" + i + "-" + k).className.length > 3;
          tl.fromTo(ws, { opacity: 0, scale: em ? 1.3 : 1.0, y: 14 }, { opacity: 1, scale: 1, y: 0, duration: em ? 0.22 : 0.14, ease: em ? "back.out(3)" : "back.out(2)" }, g.start + k * step);
        });
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
