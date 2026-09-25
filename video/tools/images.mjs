/**
 * Step 2: find the pictures, look at them, keep the good ones.
 *
 *   node video/tools/images.mjs <day> list --page "Stanislav Petrov" --search "Soviet early warning radar"
 *        every public-domain image on those articles / matching that Commons
 *        search, as a numbered contact sheet: <day>/.candidates/sheet.jpg
 *        (look at it — a caption cannot tell you a picture is dull or blurry)
 *
 *   node video/tools/images.mjs <day> get 7 petrov-portrait
 *   node video/tools/images.mjs <day> get "File:Some file.jpg" radar
 *        download #7 from the last list (or an exact Commons file) at 1920px
 *        into <day>/assets/, and record its credit in assets/credits.json
 *
 * Only public domain and CC0 ever reach assets/ — the licence is checked
 * again on `get`, whatever the list said, so an exact File: name cannot
 * smuggle a CC BY-SA image in.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { commonsApi, download, fileInfo, wikiApi } from './lib/wiki.mjs';

const [dayArg, cmd, ...rest] = process.argv.slice(2);
if (!dayArg || !['list', 'get'].includes(cmd)) {
  console.error('usage: images.mjs <day> list [--page T]... [--search Q]... | images.mjs <day> get <n|File:...> <name>');
  process.exit(1);
}
const day = path.resolve(dayArg);
const cand = path.join(day, '.candidates');
const assets = path.join(day, 'assets');
mkdirSync(assets, { recursive: true });

const MIN_SIDE = 700;
const FONT = "C\\:/Windows/Fonts/arialbd.ttf";

if (cmd === 'list') {
  const pages = [];
  const searches = [];
  for (let i = 0; i < rest.length; i += 2) {
    if (rest[i] === '--page') pages.push(rest[i + 1]);
    else if (rest[i] === '--search') searches.push(rest[i + 1]);
  }
  /*
   * Each source gets its own share of the sheet — article images first, then
   * up to PER_SEARCH usable results per search — so one prolific search (every
   * test launch of a missile ever photographed) cannot crowd the rest out.
   */
  const PER_SEARCH = 8;
  const usable = (f) => f.publicDomain && Math.max(f.width, f.height) >= MIN_SIDE && Math.min(f.width, f.height) >= 400;
  const media = (t) => !/\.(svg|gif|ogg|ogv|webm|oga|wav|mp3|flac|mid|pdf|djvu)$/i.test(t);
  const seen = new Set();
  const infos = [];
  const take = async (titles, cap) => {
    const fresh = titles.filter((t) => media(t) && !seen.has(t));
    fresh.forEach((t) => seen.add(t));
    const byTitle = new Map((await fileInfo(fresh, 330)).map((f) => [f.title, f]));
    let n = 0;
    for (const t of fresh) {
      const f = byTitle.get(t);
      if (f && usable(f) && n < cap) {
        infos.push(f);
        n++;
      }
    }
  };
  for (const p of pages) {
    const j = await wikiApi({ action: 'query', generator: 'images', titles: p, gimlimit: 'max', redirects: '1' });
    await take((j.query?.pages ?? []).map((f) => f.title), 14);
  }
  for (const q of searches) {
    const j = await commonsApi({ action: 'query', list: 'search', srnamespace: '6', srlimit: '40', srsearch: `${q} filetype:bitmap` });
    await take((j.query?.search ?? []).map((f) => f.title), PER_SEARCH);
  }
  rmSync(cand, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  mkdirSync(cand, { recursive: true });
  const kept = [];
  for (const f of infos.slice(0, 36)) {
    const n = kept.length + 1;
    const raw = path.join(cand, `raw-${n}`);
    try {
      await download(f.thumb, raw);
      execFileSync('ffmpeg', [
        '-v', 'error', '-y', '-i', raw,
        '-vf', `scale=320:320:force_original_aspect_ratio=decrease,pad=330:376:(ow-iw)/2:46:color=0x141826,` +
          `drawtext=fontfile='${FONT}':text='${n}':x=10:y=8:fontsize=32:fontcolor=0xf5b73b,` +
          `drawtext=fontfile='${FONT}':text='${f.width}x${f.height}':x=w-tw-10:y=14:fontsize=20:fontcolor=white`,
        '-frames:v', '1', path.join(cand, `tile-${String(n).padStart(3, '0')}.png`),
      ]);
      rmSync(raw, { force: true });
      kept.push({ n, ...f });
    } catch (e) {
      rmSync(raw, { force: true });
      console.warn(`  skipped ${f.title}: ${e.message.split('\n')[0]}`);
    }
  }
  if (!kept.length) {
    console.log('No public-domain images found. Try other articles or a --search.');
    process.exit(2);
  }
  // xstack with explicit positions: the `tile` filter on an image sequence
  // dropped all but the last partial row on ffmpeg 8.1.
  const cols = 6;
  const inputs = [];
  const layout = [];
  kept.forEach((f, i) => {
    inputs.push('-i', path.join(cand, `tile-${String(f.n).padStart(3, '0')}.png`));
    layout.push(`${(i % cols) * 334}_${Math.floor(i / cols) * 380}`);
  });
  const stack = kept.length === 1 ? 'null' : `xstack=inputs=${kept.length}:layout=${layout.join('|')}:fill=0x06070a`;
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', stack, '-frames:v', '1', '-q:v', '3', path.join(cand, 'sheet.jpg')]);
  writeFileSync(path.join(cand, 'index.json'), JSON.stringify(kept, null, 2));
  console.log(`${kept.length} public-domain images → ${path.join(dayArg, '.candidates', 'sheet.jpg')}`);
  for (const f of kept) {
    console.log(`  ${String(f.n).padStart(2)}  ${f.width}x${f.height}  ${f.title.replace(/^File:/, '').slice(0, 70)}`);
    const about = [f.date, f.artist, f.description].filter(Boolean).join(' · ');
    if (about) console.log(`      ${about.slice(0, 150)}`);
  }
  process.exit(0);
}

// ── get ───────────────────────────────────────────────────────────────────
const [which, name] = rest;
if (!which || !name || !/^[a-z0-9-]+$/.test(name)) {
  console.error('get needs <n|File:...> and a lowercase-hyphen name, e.g. `get 7 petrov`');
  process.exit(1);
}
let title = which;
if (/^\d+$/.test(which)) {
  const list = JSON.parse(readFileSync(path.join(cand, 'index.json'), 'utf8'));
  const hit = list.find((f) => f.n === Number(which));
  if (!hit) throw new Error(`no #${which} in the last list`);
  title = hit.title;
}
if (!title.startsWith('File:')) title = `File:${title}`;
const [info] = await fileInfo([title], 1920);
if (!info) throw new Error(`not found on Commons: ${title}`);
if (!info.publicDomain) throw new Error(`REFUSED — ${title} is "${info.licence}", not public domain`);

// The original when it is already small enough and a web format; otherwise
// the 1920 thumbnail (TIFFs and huge scans come back as JPEG).
const direct = info.width <= 1920 && /^image\/(jpeg|png)$/.test(info.mime);
const src = direct ? info.url : info.thumb;
const ext = /\.png$/i.test(src) ? '.png' : '.jpg';
for (const e of ['.jpg', '.png']) rmSync(path.join(assets, name + e), { force: true });
const file = path.join(assets, name + ext);
await download(src, file);

const creditsFile = path.join(assets, 'credits.json');
const credits = existsSync(creditsFile) ? JSON.parse(readFileSync(creditsFile, 'utf8')) : {};
credits[name + ext] = {
  file: info.title,
  page: info.page,
  licence: info.licence,
  artist: info.artist,
  date: info.date,
  description: info.description,
};
writeFileSync(creditsFile, JSON.stringify(credits, null, 2));
const dims = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim();
console.log(`assets/${name}${ext}  ${dims.replace(',', 'x')}  ${info.licence} — ${info.title}`);
