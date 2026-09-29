/**
 * Publish the in-app films to Cloudflare R2 (app update 1.1).
 *
 *   node D:/android/history-unlocked/video/tools/publish-films.mjs [--dry]
 *
 * Uploads every clip in video/app-clips/ that the bucket does not have yet (or
 * whose size changed — a day re-made after a fix), then rewrites films.json,
 * the index the app reads. Safe to run any number of times.
 *
 * The app shows the film for a date on that date's lead card. Every URL in the
 * index carries `?v=<bytes>`, so a re-made film is a new URL and the year-long
 * cache on the old one never serves a stale cut.
 *
 * Needs `wrangler login` once on this machine (a browser OAuth — no token ever
 * passes through a file or a chat). The nightly run calls this after delivery.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUCKET = 'history-unlocked-films';
const WRANGLER = 'wrangler@4.143.0';

const videoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const clipsDir = path.join(videoDir, 'app-clips');
const uploadedPath = path.join(clipsDir, 'uploaded.json');
const dry = process.argv.includes('--dry');

function wrangler(args) {
  if (dry) {
    console.log(`  (dry) wrangler ${args.join(' ')}`);
    return;
  }
  // shell: true because npx is a .cmd on Windows; every argument is quoted.
  const quoted = args.map((a) => (/[\s"&|<>^]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a));
  const r = spawnSync('npx', ['--yes', WRANGLER, ...quoted], {
    cwd: videoDir,
    shell: true,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    const out = `${r.stdout ?? ''}\n${r.stderr ?? ''}`.trim();
    if (/not authenticated|wrangler login/i.test(out)) {
      throw new Error('wrangler is not logged in on this machine — run: npx wrangler login');
    }
    throw new Error(`wrangler ${args.slice(0, 3).join(' ')} failed:\n${out.slice(-1500)}`);
  }
}

function put(key, file, contentType, cacheControl) {
  wrangler([
    'r2', 'object', 'put', `${BUCKET}/${key}`,
    `--file=${file}`,
    `--content-type=${contentType}`,
    `--cache-control=${cacheControl}`,
    '--remote',
  ]);
}

const index = JSON.parse(readFileSync(path.join(clipsDir, 'index.json'), 'utf8'));
const uploaded = existsSync(uploadedPath) ? JSON.parse(readFileSync(uploadedPath, 'utf8')) : {};

// Newest film per date: a date filmed again next year replaces the old one.
const byDate = new Map();
for (const e of index) {
  const prev = byDate.get(e.dateKey);
  if (!prev || e.date > prev.date) byDate.set(e.dateKey, e);
}

const films = {};
let sent = 0;
for (const [dateKey, e] of [...byDate].sort()) {
  const files = [
    [e.video, 'video/mp4'],
    [e.poster, 'image/jpeg'],
  ];
  if (!files.every(([f]) => existsSync(path.join(clipsDir, f)))) {
    console.log(`  skip ${dateKey}: ${e.video} or its poster is missing`);
    continue;
  }
  const versions = [];
  for (const [name, type] of files) {
    const file = path.join(clipsDir, name);
    const bytes = statSync(file).size;
    versions.push(bytes);
    if (uploaded[name] === bytes) continue;
    console.log(`  ↑ ${name} (${(bytes / 1e6).toFixed(1)} MB)`);
    put(name, file, type, 'public, max-age=31536000, immutable');
    uploaded[name] = bytes;
    sent++;
    if (!dry) writeFileSync(uploadedPath, JSON.stringify(uploaded, null, 2) + '\n');
  }
  films[dateKey] = {
    date: e.date,
    eventId: e.eventId ?? null,
    title: e.title,
    seconds: e.seconds,
    video: `${e.video}?v=${versions[0]}`,
    poster: `${e.poster}?v=${versions[1]}`,
  };
}

const indexFile = path.join(clipsDir, 'films.json');
writeFileSync(indexFile, JSON.stringify({ version: 1, films }, null, 2) + '\n');
// Short cache: tonight's film must reach phones that already hold yesterday's index.
put('films.json', indexFile, 'application/json', 'public, max-age=300');

console.log(`films.json → ${Object.keys(films).length} date(s); ${sent} file(s) uploaded${dry ? ' (dry run)' : ''}`);
