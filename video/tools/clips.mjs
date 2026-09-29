/**
 * Archive film: find public-domain footage on Commons, look at it, cut a shot.
 *
 *   node video/tools/clips.mjs <day> list --search "Battle of Britain" --page "Avro Anson"
 *        every public-domain video on those articles / matching that search,
 *        one row of four frames each: <day>/.clips/sheet.jpg
 *
 *   node video/tools/clips.mjs <day> scan 3 [--from 60] [--to 240] [--every 5]
 *        frames of film #3 (or "File:...") with their timestamps, to find the
 *        exact moment: <day>/.clips/scan.jpg — LOOK at it
 *
 *   node video/tools/clips.mjs <day> get 3 bomber-bank --at 128.5 --len 4 [--fit band|fill] [--focus 50] [--color]
 *        cut that shot into assets/<name>.mp4: 1080x1920, 30 fps, silent,
 *        black & white unless --color. "band" (default) keeps the whole frame
 *        in a band over a blurred copy of itself; "fill" crops to fill the
 *        screen (only for sharp HD footage). --focus: 0 = left edge, 100 = right.
 *
 * Same licence gate as images.mjs: public domain / CC0 only, checked again
 * on `get`. Footage is streamed from Commons with seeks — a two-hour film is
 * never downloaded whole.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { commonsApi, download, fileInfo, wikiApi } from './lib/wiki.mjs';

const UA = 'HistoryUnlockedShorts/1.0 (https://history-unlocked-fa9a9.web.app; support@gridconvertpro.com)';
const FONT = "C\\:/Windows/Fonts/arialbd.ttf";
const VIDEO = /\.(webm|ogv|mpg|mpeg|mp4)$/i;

const [dayArg, cmd, ...rest] = process.argv.slice(2);
if (!dayArg || !['list', 'scan', 'get'].includes(cmd)) {
  console.error('usage: clips.mjs <day> list [--page T]... [--search Q]... | scan <n|File:> [--from s --to s --every s] | get <n|File:> <name> --at s --len s');
  process.exit(1);
}
const day = path.resolve(dayArg);
const work = path.join(day, '.clips');
const assets = path.join(day, 'assets');
mkdirSync(work, { recursive: true });
mkdirSync(assets, { recursive: true });

const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? fallback : rest[i + 1];
};
const flag = (name) => rest.includes(`--${name}`);
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
/*
 * upload.wikimedia.org answers a burst of seeks with 429 Too Many Requests;
 * wait and try again rather than dropping the film.
 */
function patient(bin, args, opts) {
  for (let i = 1; ; i++) {
    try {
      return execFileSync(bin, args, opts);
    } catch (e) {
      if (i >= 5 || !/429/.test(String(e.stderr ?? e.message))) throw e;
      sleep(4000 * i);
    }
  }
}
const ff = (args) => patient('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
const probe = (url) =>
  Number.parseFloat(
    patient('ffprobe', ['-v', 'error', ...(/^https?:/.test(url) ? ['-user_agent', UA] : []), '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', url], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(),
  );
const bare = (url) => url.replace(/\?.*$/, '');
/*
 * A film under CACHE_MAX is downloaded once into .clips/cache and read from
 * disk: seeking a small file over HTTP is where the 429s and the unreadable
 * frames came from (Berlin airlift.ogv, 29 Sep — only a flaky 240p copy).
 */
const CACHE_MAX = 150e6;
async function cached(url) {
  const u = bare(url);
  const file = path.join(work, 'cache', decodeURIComponent(u.split('/').pop()));
  if (existsSync(file)) return file;
  const head = await fetch(u, { method: 'HEAD', headers: { 'User-Agent': UA } });
  const size = Number(head.headers.get('content-length'));
  if (!head.ok || !(size > 0 && size < CACHE_MAX)) return null;
  mkdirSync(path.dirname(file), { recursive: true });
  await download(u, file);
  return file;
}
/** Where to read a film from: the local copy if it is small, else a small transcode to look at, else the original. */
async function lookUrl(url, { cache = true } = {}) {
  const local = cache ? await cached(url) : null;
  if (local) return local;
  const u = bare(url);
  const m =/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/)([0-9a-f]\/[0-9a-f]{2}\/)([^/]+)$/.exec(u);
  if (m) {
    for (const r of ['360p.vp9.webm', '360p.webm', '240p.vp9.webm', '480p.vp9.webm']) {
      const t = `${m[1]}transcoded/${m[2]}${m[3]}/${m[3]}.${r}`;
      const res = await fetch(t, { method: 'HEAD', headers: { 'User-Agent': UA } });
      if (res.ok) return t;
    }
  }
  return u;
}
/** -user_agent only for http sources — a local cached file takes no protocol options. */
const src = (url) => (/^https?:/.test(url) ? ['-user_agent', UA, '-i', url] : ['-i', url]);
const clock = (s) => `${Math.floor(s / 60)}m${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Frame at `t` seconds of a remote video → a PNG, fast input seek over HTTP. */
function grab(url, t, file, w, h) {
  ff([
    '-ss', t.toFixed(2), ...src(url), '-frames:v', '1',
    '-vf', `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0x141826`,
    file,
  ]);
}

function stack(tiles, cols, w, h, out) {
  const inputs = tiles.flatMap((t) => ['-i', t]);
  const layout = tiles.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|');
  const filter = tiles.length === 1 ? 'null' : `xstack=inputs=${tiles.length}:layout=${layout}:fill=0x06070a`;
  ff([...inputs, '-filter_complex', filter, '-frames:v', '1', '-q:v', '3', out]);
}

async function resolveFile(which) {
  let title = which;
  if (/^\d+$/.test(which)) {
    const list = JSON.parse(readFileSync(path.join(work, 'index.json'), 'utf8'));
    const hit = list.find((f) => f.n === Number(which));
    if (!hit) throw new Error(`no #${which} in the last list`);
    title = hit.title;
  }
  if (!title.startsWith('File:')) title = `File:${title}`;
  const [info] = await fileInfo([title], 640);
  if (!info) throw new Error(`not found on Commons: ${title}`);
  if (!info.publicDomain) throw new Error(`REFUSED — ${title} is "${info.licence}", not public domain`);
  return info;
}

// ── list ──────────────────────────────────────────────────────────────────
if (cmd === 'list') {
  const pages = [];
  const searches = [];
  const files = [];
  for (let i = 0; i < rest.length; i += 2) {
    if (rest[i] === '--page') pages.push(rest[i + 1]);
    else if (rest[i] === '--search') searches.push(rest[i + 1]);
    else if (rest[i] === '--file') files.push(rest[i + 1].startsWith('File:') ? rest[i + 1] : `File:${rest[i + 1]}`);
  }
  const titles = [...files];
  for (const p of pages) {
    const j = await wikiApi({ action: 'query', generator: 'images', titles: p, gimlimit: 'max', redirects: '1' });
    titles.push(...(j.query?.pages ?? []).map((f) => f.title).filter((t) => VIDEO.test(t)));
  }
  for (const q of searches) {
    const j = await commonsApi({ action: 'query', list: 'search', srnamespace: '6', srlimit: '30', srsearch: `${q} filetype:video` });
    titles.push(...(j.query?.search ?? []).map((f) => f.title));
  }
  const infos = (await fileInfo([...new Set(titles)], 640)).filter((f) => f.publicDomain && Math.min(f.width, f.height) >= 240);
  rmSync(path.join(work, 'tiles'), { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  mkdirSync(path.join(work, 'tiles'), { recursive: true });
  const kept = [];
  const rows = [];
  for (const f of infos.slice(0, 12)) {
    const n = kept.length + 1;
    try {
      // A dozen films are only glanced at here — nothing is downloaded yet.
      const look = await lookUrl(f.url, { cache: false });
      const seconds = probe(look);
      const tiles = [];
      for (const [k, p] of [0.12, 0.37, 0.62, 0.87].entries()) {
        const tile = path.join(work, 'tiles', `${n}-${k}.png`);
        grab(look, seconds * p, tile, 320, 200);
        tiles.push(tile);
      }
      const row = path.join(work, 'tiles', `row-${n}.png`);
      ff([
        ...tiles.flatMap((t) => ['-i', t]),
        '-filter_complex',
        `[0][1][2][3]hstack=inputs=4,pad=iw:ih+34:0:34:color=0x06070a,` +
          `drawtext=fontfile='${FONT}':text='${n}':x=8:y=4:fontsize=28:fontcolor=0xf5b73b,` +
          `drawtext=fontfile='${FONT}':text='${clock(seconds)} · ${f.width}x${f.height}':x=60:y=8:fontsize=20:fontcolor=white`,
        '-frames:v', '1', row,
      ]);
      rows.push(row);
      kept.push({ n, seconds, ...f });
    } catch (e) {
      console.warn(`  skipped ${f.title}: ${String(e.stderr ?? e.message).split('\n')[0]}`);
    }
  }
  if (!kept.length) {
    console.log('No public-domain film found. Try other searches (a war, a place, a decade + "newsreel").');
    process.exit(2);
  }
  ff([...rows.flatMap((r) => ['-i', r]), '-filter_complex', rows.length === 1 ? 'null' : `vstack=inputs=${rows.length}`, '-frames:v', '1', '-q:v', '3', path.join(work, 'sheet.jpg')]);
  writeFileSync(path.join(work, 'index.json'), JSON.stringify(kept, null, 2));
  console.log(`${kept.length} public-domain films → ${path.join(dayArg, '.clips', 'sheet.jpg')}`);
  for (const f of kept) {
    console.log(`  ${String(f.n).padStart(2)}  ${clock(f.seconds)}  ${f.width}x${f.height}  ${f.title.replace(/^File:/, '').slice(0, 80)}`);
    const about = [f.date, f.description].filter(Boolean).join(' · ');
    if (about) console.log(`      ${about.slice(0, 150)}`);
  }
  process.exit(0);
}

// ── scan ──────────────────────────────────────────────────────────────────
if (cmd === 'scan') {
  const info = await resolveFile(rest[0]);
  const look = await lookUrl(info.url);
  const seconds = probe(look);
  const from = Number(opt('from', 0));
  const to = Math.min(Number(opt('to', seconds)), seconds - 0.5);
  const every = Number(opt('every', Math.max(2, Math.ceil((to - from) / 36))));
  const dir = path.join(work, 'scan');
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  mkdirSync(dir, { recursive: true });
  const tiles = [];
  for (let t = from, k = 0; t <= to && k < 72; t += every, k++) {
    const raw = path.join(dir, `raw-${k}.png`);
    const tile = path.join(dir, `tile-${k}.png`);
    try {
      grab(look, t, raw, 360, 220);
      ff(['-i', raw, '-vf', `pad=iw:ih+30:0:30:color=0x06070a,drawtext=fontfile='${FONT}':text='${t.toFixed(1)}s':x=8:y=4:fontsize=22:fontcolor=0xf5b73b`, tile]);
      tiles.push(tile);
    } catch {
      /* past the end or an undecodable spot — skip it */
    }
  }
  if (!tiles.length) throw new Error('no frames could be read');
  stack(tiles, 6, 360, 250, path.join(work, 'scan.jpg'));
  console.log(`${tiles.length} frames of ${info.title} (${clock(seconds)}), ${from}s→${to.toFixed(0)}s every ${every}s → ${path.join(dayArg, '.clips', 'scan.jpg')}`);
  process.exit(0);
}

// ── get ───────────────────────────────────────────────────────────────────
const [which, name] = rest;
if (!which || !name || !/^[a-z0-9-]+$/.test(name)) {
  console.error('get needs <n|File:...> and a lowercase-hyphen name, e.g. `get 3 bomber-bank --at 128 --len 4`');
  process.exit(1);
}
const at = Number(opt('at', NaN));
const len = Number(opt('len', 4));
if (!Number.isFinite(at) || !(len > 0.5 && len <= 12)) {
  console.error('get needs --at <seconds> and --len <0.5–12 seconds>');
  process.exit(1);
}
const fit = opt('fit', 'band');
const focus = Math.max(0, Math.min(100, Number(opt('focus', 50)))) / 100;
const info = await resolveFile(which);
const grade = flag('color') ? '' : ',hue=s=0';
// A touch of contrast; old prints are grey and flat on a phone.
const tone = `eq=contrast=1.12:brightness=0.02${grade}`;
const filter =
  fit === 'fill'
    ? `[0:v]scale=-2:1920,crop=1080:1920:(iw-1080)*${focus}:0,${tone},setsar=1,fps=30[v]`
    : `[0:v]split=2[a][b];` +
      `[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:2,eq=brightness=-0.12${grade}[bg];` +
      `[b]scale=1080:-2,${tone}[fg];` +
      `[bg][fg]overlay=0:(H-h)/2-220,setsar=1,fps=30[v]`;
const out = path.join(assets, `${name}.mp4`);
ff([
  '-ss', at.toFixed(2), ...src((await cached(info.url)) ?? bare(info.url)), '-t', len.toFixed(2),
  '-filter_complex', filter, '-map', '[v]', '-an',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  out,
]);
const got = Number.parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', out], { encoding: 'utf8' }));
if (!(got > len - 0.4)) throw new Error(`only ${got.toFixed(2)}s came out — is --at past the end of the film?`);
// A still of the shot's middle for the contact sheet / quick look.
ff(['-ss', (got / 2).toFixed(2), '-i', out, '-frames:v', '1', '-vf', 'scale=270:-2', path.join(work, `${name}.jpg`)]);

const creditsFile = path.join(assets, 'credits.json');
const credits = existsSync(creditsFile) ? JSON.parse(readFileSync(creditsFile, 'utf8')) : {};
credits[`${name}.mp4`] = {
  file: info.title,
  page: info.page,
  licence: info.licence,
  artist: info.artist,
  date: info.date,
  description: info.description,
  film: { at, len: Math.round(got * 100) / 100, fit },
};
writeFileSync(creditsFile, JSON.stringify(credits, null, 2));
console.log(`assets/${name}.mp4  ${got.toFixed(2)}s  ${fit}  ${info.licence} — ${info.title} @ ${at}s  (look: .clips/${name}.jpg)`);
