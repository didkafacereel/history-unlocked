/**
 * The scene library: every kind of scene a daily video is built from, as
 * HTML + GSAP, so a day is written as DATA (script.json) instead of a
 * hand-made template. The look is the one set by the first two hand-built
 * days (Black Friday, Stamford Bridge) — same type, same gold, same pacing.
 *
 * Each renderer gets (scene, ctx) and returns { html, anim }: `anim` is a list
 * of GSAP calls with ABSOLUTE seconds, already resolved from the phrase cues —
 * the generated page carries no timing arithmetic of its own.
 *
 * TikTok safe zone: top ~150px, bottom ~400px, right ~130px stay clear. The
 * captions sit at y 1180–1380, so scene text lives above ~1150.
 */

// ── text helpers ──────────────────────────────────────────────────────────
export const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Escape, then *word* → gold. Typographic apostrophes for the serif. */
export const md = (s) =>
  esc(s)
    .replace(/'/g, '’')
    .replace(/\*([^*]+)\*/g, '<span class="hl">$1</span>');

const plainLen = (s) => String(s ?? '').replace(/\*/g, '').length;

/** Size a headline by its length — long lines must still fit above the captions. */
export function sizeFor(text, steps) {
  const n = plainLen(text);
  for (const [max, px] of steps) if (n <= max) return px;
  return steps[steps.length - 1][1];
}

const STATEMENT_SIZES = [[16, 136], [28, 120], [44, 104], [62, 90], [84, 78], [999, 68]];
const PHOTO_SIZES = [[20, 104], [36, 92], [56, 80], [80, 70], [999, 62]];

// ── CSS ───────────────────────────────────────────────────────────────────
export const CSS = `
@font-face { font-family: "Anton"; src: url("fonts/anton-normal.woff2") format("woff2"); font-weight: 400; font-style: normal; }
@font-face { font-family: "DM Serif Display"; src: url("fonts/dmserif-normal.woff2") format("woff2"); font-weight: 400; font-style: normal; }
@font-face { font-family: "DM Serif Display"; src: url("fonts/dmserif-italic.woff2") format("woff2"); font-weight: 400; font-style: italic; }
:root {
  --void: #06070a; --ink-raised: #141826; --gold: #f5b73b; --gold-soft: rgba(245, 183, 59, 0.22);
  --text: #f4f6fb; --text-2: rgba(244, 246, 251, 0.78);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { margin: 0; overflow: hidden; background: var(--void); }
#root { position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--void); color: var(--text); }
.scene { position: absolute; inset: 0; overflow: hidden; }
.layer { position: absolute; inset: 0; }
.solid { background: var(--void); }
.cover { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.shade { background: radial-gradient(ellipse 90% 60% at 50% 38%, rgba(6, 7, 10, 0.35), rgba(6, 7, 10, 0.86) 70%), rgba(6, 7, 10, 0.25); }
.shade-top { background: linear-gradient(180deg, rgba(6, 7, 10, 0.92) 0%, rgba(6, 7, 10, 0.72) 38%, rgba(6, 7, 10, 0.2) 62%, rgba(6, 7, 10, 0.75) 100%); }
.dim { background: rgba(6, 7, 10, 0.82); }
.glow { background: radial-gradient(ellipse 70% 45% at 50% 40%, var(--gold-soft), transparent 70%); }
.content { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 200px 150px 420px 72px; gap: 18px; }
.kicker { font-family: "Anton", sans-serif; font-size: 46px; letter-spacing: 0.2em; color: var(--gold); text-transform: uppercase; line-height: 1.05; }
.label { font-family: "Anton", sans-serif; font-size: 40px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text); line-height: 1.1; }
.serif { font-family: "DM Serif Display", serif; font-weight: 400; text-wrap: balance; }
.italic { font-family: "DM Serif Display", serif; font-style: italic; text-wrap: balance; }
.hl { color: var(--gold); }
.rule { width: 100%; max-width: 560px; height: 4px; background: var(--gold); }
.frame { position: relative; width: 100%; overflow: hidden; border: 3px solid var(--gold); background: var(--ink-raised); }
.frame img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.frame img.contain { object-fit: contain; }
.ghost { position: absolute; left: -40px; top: 250px; font-family: "Anton", sans-serif; font-size: 330px; line-height: 0.9; color: rgba(245, 183, 59, 0.12); white-space: nowrap; }
.fact { font-size: 46px; line-height: 1.2; color: var(--text); max-width: 820px; }
.src { font-size: 32px; color: var(--text-2); }

/* title */
.t-date { font-family: "Anton", sans-serif; font-size: 66px; letter-spacing: 0.08em; line-height: 1; }
.t-year { font-family: "DM Serif Display", serif; line-height: 0.86; letter-spacing: -0.03em; color: var(--gold); white-space: nowrap; }
.t-place { font-size: 50px; color: var(--text-2); max-width: 780px; line-height: 1.15; }

/* pair */
.pair { display: flex; gap: 32px; width: 100%; max-width: 858px; }
.card { flex: 1; display: flex; flex-direction: column; gap: 14px; }
.card .frame { height: 520px; }
.role { font-size: 36px; color: var(--gold); line-height: 1.15; }

/* statement / quote */
.s-main { line-height: 1.02; letter-spacing: -0.02em; max-width: 858px; margin-top: 60px; }
.q-mark { font-family: "DM Serif Display", serif; font-size: 260px; line-height: 0.6; color: var(--gold); height: 120px; margin-top: 40px; }
.q-text { line-height: 1.1; max-width: 858px; }
.q-by { font-size: 40px; color: var(--gold); }

/* number */
.n-text { justify-content: center; padding-top: 240px; padding-bottom: 700px; gap: 26px; }
.n-row { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: 24px; row-gap: 0; }
.n-row { margin-top: 28px; }
.n-counter { font-family: "Anton", sans-serif; line-height: 1.12; color: var(--gold); font-variant-numeric: tabular-nums; white-space: nowrap; }
.n-unit { font-family: "Anton", sans-serif; font-size: 96px; letter-spacing: 0.06em; color: var(--text); }
.n-sub { font-size: 58px; color: var(--text); max-width: 840px; line-height: 1.15; }

/* photo */
.p-text { gap: 20px; }
.p-line { line-height: 1.05; max-width: 858px; }
.p-fact { font-size: 44px; line-height: 1.2; color: var(--text); max-width: 840px; text-shadow: 0 2px 16px rgba(0, 0, 0, 0.8); }

/* document */
.d-band { position: absolute; left: 0; right: 0; top: 380px; height: 600px; overflow: hidden; border-top: 3px solid var(--gold); border-bottom: 3px solid var(--gold); }
.d-band img { width: 100%; height: 100%; object-fit: cover; display: block; }
.d-sub { position: absolute; left: 72px; right: 150px; top: 1020px; font-size: 58px; line-height: 1.12; color: var(--text); text-align: center; }
.d-credit { position: absolute; left: 72px; right: 150px; top: 322px; text-align: center; font-size: 30px; color: var(--text-2); }

/* portrait */
.pt-frame { width: 620px; }
.pt-frame .frame { height: 560px; border-color: rgba(244, 246, 251, 0.55); }
.pt-date { font-family: "DM Serif Display", serif; font-size: 88px; line-height: 1; }
.pt-line { font-size: 46px; color: var(--text); max-width: 840px; line-height: 1.2; }
.pt-line2 { font-size: 40px; color: var(--gold); max-width: 840px; line-height: 1.2; }

/* end card */
.e-content { align-items: center; justify-content: center; text-align: center; padding: 200px 110px 420px 110px; gap: 24px; }
.e-icon { width: 180px; height: 180px; border-radius: 42px; box-shadow: 0 0 60px rgba(245, 183, 59, 0.35); display: block; }
.e-story { font-size: 68px; line-height: 1.1; max-width: 820px; }
.e-app { font-size: 34px; letter-spacing: 0.18em; color: var(--text-2); }
.e-name { font-family: "Anton", sans-serif; font-size: 92px; letter-spacing: 0.02em; line-height: 1; }
.e-tag { font-size: 44px; color: var(--gold); }
.e-cta { font-family: "Anton", sans-serif; font-size: 56px; letter-spacing: 0.14em; color: var(--void); background: var(--gold); border-radius: 999px; padding: 20px 70px; margin-top: 12px; }
.e-note { font-size: 40px; color: var(--text); }
.e-credit { position: absolute; left: 80px; right: 80px; top: 1440px; font-family: "DM Serif Display", serif; font-size: 23px; color: rgba(244, 246, 251, 0.62); text-align: center; }

/* cover — the thumbnail frame. Everything inside the middle 3:4 band
   (y 240–1680), which is what a profile grid shows. */
/* Light enough that the picture carries the thumbnail; the hook text holds
   its own with a heavy shadow. */
.c-shade { background: linear-gradient(180deg, rgba(6, 7, 10, 0.45) 0%, rgba(6, 7, 10, 0.12) 28%, rgba(6, 7, 10, 0.38) 55%, rgba(6, 7, 10, 0.85) 100%); }
.c-box { position: absolute; left: 70px; right: 70px; top: 560px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 22px; }
.c-kicker { font-family: "Anton", sans-serif; font-size: 44px; letter-spacing: 0.22em; color: var(--gold); }
.c-date { font-family: "Anton", sans-serif; font-size: 60px; letter-spacing: 0.08em; color: var(--text); background: rgba(6, 7, 10, 0.55); padding: 6px 26px; border: 3px solid var(--gold); }
.c-hook { font-family: "Anton", sans-serif; line-height: 0.98; text-transform: uppercase; color: var(--text); text-shadow: 0 6px 30px rgba(0, 0, 0, 0.85); }

/* captions */
#captions { position: absolute; left: 60px; right: 140px; top: 1180px; height: 200px; z-index: 50; pointer-events: none; }
.cg { position: absolute; left: 0; right: 0; top: 0; text-align: center; font-family: "Anton", sans-serif; font-size: 80px; line-height: 1.05; letter-spacing: 0.01em; text-transform: uppercase; color: var(--text); text-shadow: 0 4px 22px rgba(0, 0, 0, 0.9), 0 0 3px rgba(0, 0, 0, 0.9); opacity: 0; }
.cg .hl { color: var(--gold); }
`;

// ── animation helpers ─────────────────────────────────────────────────────
const r3 = (n) => Math.round(n * 1000) / 1000;
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

/** Ken Burns: slow push in, pull out or pan across a still, for the scene's whole length. */
function kenBurns(a, sel, move, S) {
  const d = r3(S.end - S.start);
  const moves = {
    in: [{ scale: 1.0 }, { scale: 1.12 }],
    out: [{ scale: 1.16 }, { scale: 1.0 }],
    left: [{ scale: 1.14, xPercent: 4 }, { scale: 1.14, xPercent: -4 }],
    right: [{ scale: 1.14, xPercent: -4 }, { scale: 1.14, xPercent: 4 }],
    up: [{ scale: 1.14, yPercent: 3 }, { scale: 1.14, yPercent: -3 }],
    down: [{ scale: 1.14, yPercent: -3 }, { scale: 1.14, yPercent: 3 }],
  };
  const [from, to] = moves[move] ?? moves.in;
  a.ft(sel, from, { ...to, duration: d, ease: 'none' }, S.start);
}

const img = (src, focus, extra = '') =>
  `<img class="cover" src="${esc(src)}" alt="" style="object-position: ${esc(focus ?? '50% 50%')}"${extra} />`;

// ── scene renderers ───────────────────────────────────────────────────────
/*
 * ctx: { id, S: {start,end,duration}, cue(value, fallbackSeconds) → seconds,
 *        text(field, fallbackSeconds) → {text, at} | null, asset(file) → path,
 *        base (first moment the scene's own content may animate) }
 */
export const renderers = {
  title(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const b = ctx.base;
    const year = String(sc.year ?? '');
    const yearPx = year.length <= 4 ? 330 : year.length <= 6 ? 240 : 180;
    const html = `
      <div class="layer solid"></div>
      <div id="${id}-kb" class="layer" data-layout-allow-overflow>${img(ctx.asset(sc.image), sc.focus)}</div>
      <div class="layer shade"></div>
      <div class="layer glow"></div>
      <div class="content">
        <div id="${id}-kicker" class="kicker">${md(sc.kicker ?? 'On this day')}</div>
        <div id="${id}-date" class="t-date">${md(sc.date)}</div>
        <div id="${id}-year" class="t-year" style="font-size: ${yearPx}px">${md(year)}</div>
        <div id="${id}-rule" class="rule"></div>
        ${sc.place ? `<div id="${id}-place" class="italic t-place">${md(sc.place)}</div>` : ''}
      </div>`;
    kenBurns(a, `#${id}-kb`, sc.move ?? 'out', S);
    a.ft(`#${id}-kicker`, { opacity: 0, x: -50 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out' }, b);
    a.ft(`#${id}-date`, { opacity: 0, scale: 1.18 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'expo.out', transformOrigin: '0% 50%' }, b + 0.12);
    a.ft(`#${id}-year`, { opacity: 0, scale: 1.3 }, { opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.6)', transformOrigin: '0% 60%' }, b + 0.28);
    a.ft(`#${id}-rule`, { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'power4.out', transformOrigin: '0% 50%' }, b + 0.65);
    if (sc.place) a.ft(`#${id}-place`, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: 'sine.out' }, b + 0.95);
    return { html, anim: a.lines };
  },

  pair(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const card = (k, c) => `
      <div id="${id}-card-${k}" class="card">
        <div class="frame"${c.bg ? ` style="background: ${esc(c.bg)}"` : ''}><img id="${id}-img-${k}" data-layout-allow-overflow
          class="${c.fit === 'contain' ? 'contain' : ''}" src="${esc(ctx.asset(c.image))}" alt=""
          style="object-position: ${esc(c.focus ?? '50% 40%')}${c.fit === 'contain' ? '; padding: 28px' : ''}" /></div>
        <div class="label">${md(c.name)}</div>
        ${c.role ? `<div class="role italic">${md(c.role)}</div>` : ''}
      </div>`;
    const foot = ctx.text(sc.foot, S.start + S.duration * 0.6);
    const html = `
      <div class="layer solid"></div>
      <div class="layer glow"></div>
      <div class="content">
        ${sc.kicker ? `<div id="${id}-kicker" class="kicker">${md(sc.kicker)}</div>` : ''}
        <div class="pair">${card('a', sc.a)}${card('b', sc.b)}</div>
        ${foot ? `<div id="${id}-foot" class="label" style="font-size: 34px; letter-spacing: 0.12em; margin-top: 10px">${md(foot.text)}</div>` : ''}
      </div>`;
    const b = ctx.base;
    if (sc.kicker) a.ft(`#${id}-kicker`, { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }, b + 0.1);
    a.ft(`#${id}-card-a`, { opacity: 0, x: -90 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power4.out' }, ctx.cue(sc.a.at, b + 0.2));
    a.ft(`#${id}-card-b`, { opacity: 0, x: 90 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }, ctx.cue(sc.b.at, b + Math.min(1.2, S.duration * 0.3)));
    a.ft(`#${id}-img-a`, { scale: 1.0 }, { scale: 1.06, duration: r3(S.duration), ease: 'none' }, S.start);
    a.ft(`#${id}-img-b`, { scale: 1.1 }, { scale: 1.0, duration: r3(S.duration), ease: 'none' }, S.start);
    if (foot) a.ft(`#${id}-foot`, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'circ.out' }, foot.at);
    return { html, anim: a.lines };
  },

  statement(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const main = ctx.text(sc.main, S.start + Math.min(0.9, S.duration * 0.15));
    const fact = ctx.text(sc.fact, S.start + S.duration * 0.45);
    const source = ctx.text(sc.source, (fact?.at ?? S.start) + 0.6);
    const px = sizeFor(main.text, STATEMENT_SIZES);
    const html = `
      <div class="layer solid"></div>
      ${sc.image ? `<div id="${id}-kb" class="layer" data-layout-allow-overflow>${img(ctx.asset(sc.image), sc.focus)}</div><div class="layer dim"></div>` : ''}
      ${sc.ghost ? `<div id="${id}-ghost" class="ghost" data-layout-ignore>${esc(sc.ghost)}</div>` : ''}
      <div class="content">
        ${sc.kicker ? `<div id="${id}-kicker" class="kicker">${md(sc.kicker)}</div>` : ''}
        <div id="${id}-main" class="serif s-main" style="font-size: ${px}px">${md(main.text)}</div>
        ${fact ? `<div id="${id}-rule" class="rule"></div><div id="${id}-fact" class="italic fact">${md(fact.text)}</div>` : ''}
        ${source ? `<div id="${id}-src" class="italic src">${md(source.text)}</div>` : ''}
      </div>`;
    if (sc.image) kenBurns(a, `#${id}-kb`, sc.move ?? 'in', S);
    if (sc.ghost) a.ft(`#${id}-ghost`, { x: 0 }, { x: -240, duration: r3(S.duration), ease: 'none' }, S.start);
    if (sc.kicker) a.ft(`#${id}-kicker`, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' }, ctx.base + 0.05);
    a.ft(`#${id}-main`, { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, main.at);
    if (fact) {
      a.ft(`#${id}-rule`, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'power4.out', transformOrigin: '0% 50%' }, fact.at - 0.15);
      a.ft(`#${id}-fact`, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.6, ease: 'sine.out' }, fact.at);
    }
    if (source) a.ft(`#${id}-src`, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'sine.out' }, source.at);
    return { html, anim: a.lines };
  },

  quote(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const quote = ctx.text(sc.quote, S.start + Math.min(0.6, S.duration * 0.1));
    const by = ctx.text(sc.by, S.start + S.duration * 0.6);
    const px = sizeFor(quote.text, [[30, 100], [50, 86], [80, 74], [120, 62], [999, 54]]);
    const html = `
      <div class="layer solid"></div>
      ${sc.image ? `<div id="${id}-kb" class="layer" data-layout-allow-overflow>${img(ctx.asset(sc.image), sc.focus)}</div><div class="layer dim"></div>` : ''}
      <div class="layer glow"></div>
      <div class="content">
        ${sc.kicker ? `<div id="${id}-kicker" class="kicker">${md(sc.kicker)}</div>` : ''}
        <div id="${id}-mark" class="q-mark">“</div>
        <div id="${id}-quote" class="italic q-text" style="font-size: ${px}px">${md(quote.text)}</div>
        ${by ? `<div id="${id}-rule" class="rule" style="max-width: 200px"></div><div id="${id}-by" class="label q-by">${md(by.text)}</div>` : ''}
      </div>`;
    if (sc.image) kenBurns(a, `#${id}-kb`, sc.move ?? 'in', S);
    if (sc.kicker) a.ft(`#${id}-kicker`, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' }, ctx.base + 0.05);
    a.ft(`#${id}-mark`, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)', transformOrigin: '0% 50%' }, ctx.base + 0.1);
    a.ft(`#${id}-quote`, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, quote.at);
    if (by) {
      a.ft(`#${id}-rule`, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power4.out', transformOrigin: '0% 50%' }, by.at - 0.1);
      a.ft(`#${id}-by`, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.5, ease: 'sine.out' }, by.at);
    }
    return { html, anim: a.lines };
  },

  number(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const value = Number(sc.value);
    if (!Number.isFinite(value)) throw new Error(`${id}: number scene needs a numeric "value"`);
    const decimals = sc.decimals ?? 0;
    const fmt = (v) => {
      const s = v.toFixed(decimals);
      return sc.separator === false ? s : s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };
    const final = `${sc.prefix ?? ''}${fmt(value)}${sc.suffix ?? ''}`;
    const px = final.length <= 3 ? 300 : final.length <= 5 ? 240 : final.length <= 7 ? 190 : final.length <= 9 ? 150 : 124;
    const count = sc.count ?? {};
    const from = ctx.cue(count.from, S.start + Math.min(0.8, S.duration * 0.12));
    const to = Math.max(from + 0.6, ctx.cue(count.to, from + Math.min(2.2, S.duration * 0.4)));
    const sub = ctx.text(sc.sub, to + 0.3);
    const html = `
      <div class="layer solid"></div>
      ${sc.image ? `<div id="${id}-kb" class="layer" data-layout-allow-overflow>${img(ctx.asset(sc.image), sc.focus)}</div><div class="layer shade"></div>` : '<div class="layer glow"></div>'}
      <div class="content n-text" data-layout-allow-overlap>
        ${sc.label ? `<div id="${id}-label" class="label" style="letter-spacing: 0.14em" data-layout-allow-overlap>${md(sc.label)}</div>` : ''}
        <div id="${id}-row" class="n-row">
          <div id="${id}-counter" class="n-counter" data-layout-allow-overlap style="font-size: ${px}px" data-final="${esc(final)}">${esc(`${sc.prefix ?? ''}${fmt(sc.start ?? 0)}${sc.suffix ?? ''}`)}</div>
          ${sc.unit ? `<div id="${id}-unit" class="n-unit">${md(sc.unit)}</div>` : ''}
        </div>
        ${sub ? `<div id="${id}-sub" class="italic n-sub">${md(sub.text)}</div>` : ''}
      </div>`;
    if (sc.image) kenBurns(a, `#${id}-kb`, sc.move ?? 'out', S);
    if (sc.label) a.ft(`#${id}-label`, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out' }, ctx.base + 0.15);
    a.ft(`#${id}-row`, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)', transformOrigin: '0% 50%' }, ctx.base + 0.25);
    // The counter is a tween on a plain object; onUpdate writes the text, so
    // any seek lands on the right number.
    a.raw(
      `(function () { var o = { v: ${Number(sc.start ?? 0)} }, el = document.getElementById(${JSON.stringify(`${id}-counter`)});` +
        ` function show() { var s = o.v.toFixed(${decimals}); ${sc.separator === false ? '' : `s = s.replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");`}` +
        ` el.textContent = ${JSON.stringify(sc.prefix ?? '')} + s + ${JSON.stringify(sc.suffix ?? '')}; }` +
        ` tl.fromTo(o, { v: ${Number(sc.start ?? 0)} }, { v: ${value}, duration: ${r3(to - from)}, ease: "power2.out", onUpdate: show, onComplete: show }, ${r3(from)}); })();`,
    );
    if (sub) a.ft(`#${id}-sub`, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'sine.out' }, sub.at);
    return { html, anim: a.lines };
  },

  photo(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const line = ctx.text(sc.line, S.start + Math.min(0.7, S.duration * 0.12));
    const fact = ctx.text(sc.fact, S.start + S.duration * 0.5);
    const px = line ? sizeFor(line.text, PHOTO_SIZES) : 0;
    const html = `
      <div class="layer solid"></div>
      <div id="${id}-kb" class="layer" data-layout-allow-overflow>${img(ctx.asset(sc.image), sc.focus)}</div>
      <div class="layer shade-top"></div>
      <div class="content p-text">
        ${sc.kicker ? `<div id="${id}-kicker" class="kicker">${md(sc.kicker)}</div>` : ''}
        ${line ? `<div id="${id}-line" class="serif p-line" style="font-size: ${px}px">${md(line.text)}</div>` : ''}
        ${fact ? `<div id="${id}-fact" class="italic p-fact">${md(fact.text)}</div>` : ''}
      </div>`;
    kenBurns(a, `#${id}-kb`, sc.move ?? 'in', S);
    if (sc.kicker) a.ft(`#${id}-kicker`, { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out' }, ctx.base + 0.1);
    if (line) a.ft(`#${id}-line`, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out' }, line.at);
    if (fact) a.ft(`#${id}-fact`, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.6, ease: 'sine.out' }, fact.at);
    return { html, anim: a.lines };
  },

  document(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const sub = ctx.text(sc.sub, S.start + S.duration * 0.35);
    const html = `
      <div class="layer solid"></div>
      <div class="layer glow"></div>
      ${sc.credit ? `<div id="${id}-credit" class="italic d-credit">${md(sc.credit)}</div>` : ''}
      <div class="d-band"><div id="${id}-kb" class="layer" data-layout-allow-overflow>
        <img src="${esc(ctx.asset(sc.image))}" alt="" style="object-position: ${esc(sc.focus ?? '50% 40%')}" /></div></div>
      ${sub ? `<div id="${id}-sub" class="italic d-sub">${md(sub.text)}</div>` : ''}`;
    a.ft(`#${id}-kb`, { scale: 1.3, opacity: 0 }, { scale: 1.04, opacity: 1, duration: 0.9, ease: 'expo.out' }, ctx.base + 0.05);
    if (sc.credit) a.ft(`#${id}-credit`, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'sine.out' }, ctx.base + 0.4);
    if (sub) a.ft(`#${id}-sub`, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, sub.at);
    return { html, anim: a.lines };
  },

  portrait(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const date = ctx.text(sc.date, S.start + S.duration * 0.3);
    const line = ctx.text(sc.line, (date?.at ?? S.start) + 0.7);
    const line2 = ctx.text(sc.line2, (line?.at ?? S.start) + 1.2);
    const html = `
      <div class="layer solid"></div>
      <div class="content" style="gap: 22px">
        ${sc.kicker ? `<div id="${id}-kicker" class="kicker" style="color: rgba(244, 246, 251, 0.8)">${md(sc.kicker)}</div>` : ''}
        <div id="${id}-portrait" class="pt-frame"><div class="frame"${sc.bg ? ` style="background: ${esc(sc.bg)}"` : ''}>
          <img id="${id}-img" data-layout-allow-overflow class="${sc.fit === 'contain' ? 'contain' : ''}" src="${esc(ctx.asset(sc.image))}" alt=""
            style="object-position: ${esc(sc.focus ?? '50% 35%')}" /></div></div>
        ${date ? `<div id="${id}-date" class="pt-date">${md(date.text)}</div>` : ''}
        ${line ? `<div id="${id}-line" class="italic pt-line">${md(line.text)}</div>` : ''}
        ${line2 ? `<div id="${id}-line2" class="italic pt-line2">${md(line2.text)}</div>` : ''}
      </div>`;
    const b = ctx.base;
    if (sc.kicker) a.ft(`#${id}-kicker`, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'sine.out' }, b + 0.15);
    a.ft(`#${id}-portrait`, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'sine.out' }, b + 0.25);
    a.ft(`#${id}-img`, { scale: 1.0 }, { scale: 1.07, duration: r3(S.duration), ease: 'none' }, S.start);
    if (date) a.ft(`#${id}-date`, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'sine.out' }, date.at);
    if (line) a.ft(`#${id}-line`, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'sine.out' }, line.at);
    if (line2) a.ft(`#${id}-line2`, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'sine.out' }, line2.at);
    return { html, anim: a.lines };
  },

  /* The end card is filled from video/channel.json (the app's stage), never
     from the day's script — see compose.mjs. */
  endcard(sc, ctx) {
    const { id, S } = ctx;
    const a = animator();
    const e = sc.card;
    const storyAt = ctx.cue(sc.storyAt, S.start + 0.1);
    const ctaAt = ctx.cue(sc.ctaAt, S.start + S.duration * 0.45);
    const html = `
      <div class="layer solid"></div>
      ${sc.image ? `<div class="layer" style="opacity: 0.14">${img(ctx.asset(sc.image), sc.focus)}</div>` : ''}
      <div class="layer glow"></div>
      <div id="${id}-content" class="content e-content">
        <img id="${id}-icon" class="e-icon" src="assets/icon.png" alt="" />
        <div id="${id}-story" class="serif e-story">${md(e.story)}</div>
        <div id="${id}-app" class="label e-app">${md(e.app)}</div>
        <div id="${id}-name" class="e-name">${md(e.name)}</div>
        <div id="${id}-tag" class="italic e-tag">${md(e.tag)}</div>
        <div id="${id}-cta" class="e-cta">${md(e.pill)}</div>
        <div id="${id}-note" class="italic e-note">${md(e.note)}</div>
      </div>
      <div id="${id}-credit" class="e-credit">${esc(sc.credits)}</div>`;
    a.ft(`#${id}-icon`, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.8)' }, S.start + 0.15);
    a.ft(`#${id}-story`, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, storyAt);
    a.ft(`#${id}-app`, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'sine.out' }, ctaAt - 0.7);
    a.ft(`#${id}-name`, { opacity: 0, scale: 1.2 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'expo.out' }, ctaAt - 0.6);
    a.ft(`#${id}-tag`, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'sine.out' }, ctaAt - 0.3);
    a.ft(`#${id}-cta`, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' }, ctaAt);
    a.ft(`#${id}-cta`, { scale: 1 }, { scale: 1.07, duration: 0.45, ease: 'sine.inOut', yoyo: true, repeat: 3, immediateRender: false }, ctaAt + 0.55);
    a.ft(`#${id}-note`, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'sine.out' }, ctaAt + 0.8);
    a.ft(`#${id}-credit`, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'sine.out' }, ctaAt - 0.4);
    a.ft(`#${id}-content`, { opacity: 1 }, { opacity: 0, duration: 0.4, ease: 'power2.in' }, S.end - 0.45);
    return { html, anim: a.lines };
  },
};

/** The thumbnail: the first frames of the video, so it is the default cover everywhere. */
export function renderCover(cover, asset, duration) {
  const lines = (cover.lines ?? []).map(String);
  const longest = Math.max(...lines.map(plainLen), 1);
  const px = longest <= 8 ? 190 : longest <= 11 ? 160 : longest <= 14 ? 132 : longest <= 18 ? 108 : 92;
  return `
      <div id="cover" class="clip" data-start="0" data-duration="${duration}" data-track-index="20" style="position: absolute; inset: 0; z-index: 40">
        <div class="layer solid"></div>
        ${img(asset(cover.image), cover.focus)}
        <div class="layer c-shade"></div>
        <div class="c-box">
          <div class="c-kicker">${md(cover.kicker ?? 'ON THIS DAY')}</div>
          <div class="c-date">${md(cover.date)}</div>
          <div class="c-hook" style="font-size: ${px}px">${lines.map(md).join('<br />')}</div>
        </div>
      </div>`;
}
