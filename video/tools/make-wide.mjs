/**
 * The 16:9 long video (≈5 min, 1920×1080): script.json → a finished, checked
 * video in old-history/ready/<slug>/. Sister of make.mjs (the vertical Shorts),
 * sharing its voice, music and checks; the picture side is lib/wide.mjs.
 *
 *   node video/tools/make-wide.mjs video/old-history/cannae             everything
 *   node video/tools/make-wide.mjs video/old-history/cannae --no-render stop after the snapshots
 *   node video/tools/make-wide.mjs video/old-history/cannae --render-only
 *
 *   1. resolve  end card from old-history/channel.json, CTA rules, music bed
 *   2. voice    Kokoro, one WAV per sentence      3. narrate  join + time + -14 LUFS
 *   4. mix      a bed of several PD tracks, crossfaded, ducked under the voice
 *   5. compose  index.html            6. check  hyperframes lint + layout
 *   7. snapshot contact sheets — LOOK AT THEM   8. render + verify   9. deliver
 *
 * script.json: "format": 2, "mode": "wide", "sentences", "scenes" (types in lib/wide.mjs),
 * "maps" (animated battle maps), "music": { "tracks": [{ id, start?, len? }] },
 * "chapters": [{ at: "s1", title }], "thumb": {…}, "post": { youtube: { title, description, tags }, pinned }.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HYPERFRAMES, mix, narration, videoLength, voice } from './lib/audio.mjs';
import { composeWide } from './lib/wide.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const videoDir = path.resolve(here, '..');
const ohDir = path.join(videoDir, 'old-history');
const args = process.argv.slice(2);
const dayArg = args.find((a) => !a.startsWith('--'));
if (!dayArg) {
  console.error('usage: node video/tools/make-wide.mjs <clip folder> [--no-render | --render-only] [--draft]');
  process.exit(1);
}
const dir = path.resolve(dayArg);
const noRender = args.includes('--no-render');
const renderOnly = args.includes('--render-only');
const draft = args.includes('--draft');
const fail = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};
const step = (s) => console.log(`\n── ${s}`);
const npx = (cmdArgs, opts = {}) =>
  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['-y', HYPERFRAMES, ...cmdArgs], {
    cwd: dir, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, PRODUCER_PAGE_NAVIGATION_TIMEOUT_MS: '300000' }, ...opts,
  });

// ── 1. resolve ────────────────────────────────────────────────────────────
step('resolve');
const script = JSON.parse(readFileSync(path.join(dir, 'script.json'), 'utf8'));
const channel = JSON.parse(readFileSync(path.join(videoDir, 'channel.json'), 'utf8'));
const card = JSON.parse(readFileSync(path.join(ohDir, 'channel.json'), 'utf8')).card;
const library = JSON.parse(readFileSync(path.join(videoDir, 'music', 'library.json'), 'utf8'));
if (script.format !== 2 || script.mode !== 'wide') fail('script.json needs "format": 2 and "mode": "wide"');
const MIN_LEN = 240;
const MAX_LEN = 420;
const cta = script.cta;
if (!cta) fail('a long video needs its own "cta" { story, say, pill, note } — new every time');
for (const k of ['story', 'say', 'pill', 'note']) if (!cta[k]) fail(`script.json "cta" needs "${k}"`);
if (/\d/.test(cta.say)) fail('cta.say has digits — spell numbers out for the voice');
if (!/subscri/i.test(cta.say)) fail('cta must still ask to subscribe (in "say")');
if (/\bapp\b/i.test(`${cta.say} ${cta.note} ${cta.story}`)) fail('a channel video never mentions the app');
if (cta.pill.length > 16) fail(`cta.pill "${cta.pill}" is over 16 characters`);
if (cta.say.split(/\s+/).length > 22) fail('cta.say is over 22 words');
const ohLog = path.join(ohDir, 'log.json');
const prior = (existsSync(ohLog) ? JSON.parse(readFileSync(ohLog, 'utf8')) : []).filter((l) => l.slug !== script.slug && l.cta);
if (prior.some((l) => l.cta.toLowerCase() === cta.say.toLowerCase())) fail('this cta.say was already used — write a new one');
const stage = { ...card, ...cta };

const trackSpec = script.music?.tracks;
if (!Array.isArray(trackSpec) || !trackSpec.length) fail('script.music.tracks needs at least one { id }');
const tracks = trackSpec.map((t) => {
  const tr = library.tracks.find((x) => x.id === t.id);
  if (!tr) fail(`music track "${t.id}" is not in music/library.json`);
  const file = path.join(videoDir, 'music', tr.file);
  if (!existsSync(file)) fail(`${tr.file} is missing — run node video/tools/fetch-music.mjs`);
  return { ...t, tr, file };
});
for (const k of ['date', 'slug']) if (!script[k]) fail(`script.json needs "${k}"`);
const ids = new Set();
for (const s of script.sentences) {
  if (ids.has(s.id)) fail(`two sentences share the id "${s.id}"`);
  ids.add(s.id);
  if (!s.say || !s.show) fail(`sentence ${s.id} needs both "say" and "show"`);
  if (/\d/.test(s.say)) fail(`sentence ${s.id} "say" has digits — spell numbers out ("${s.say}")`);
}
script.scenes.forEach((sc, i) => {
  sc.id ??= `scene${i + 1}`;
  if (i > 0 && !ids.has(String(sc.from ?? '').replace(/[@+-].*$/, ''))) fail(`${sc.id} opens on "${sc.from}", which is not a sentence id or a cue on one`);
});

// Credits: the artists recorded when each image was fetched.
const creditsFile = path.join(dir, 'assets', 'credits.json');
const credits = existsSync(creditsFile) ? JSON.parse(readFileSync(creditsFile, 'utf8')) : {};
const usedFiles = new Set(script.scenes.flatMap((sc) => [sc.image, sc.clip]).filter(Boolean));
const films = [...new Set(Object.entries(credits).filter(([f, c]) => usedFiles.has(f) && c.film).map(([, c]) => c.file.replace(/^File:/, '').replace(/\.(webm|ogv|mpe?g|mp4)$/i, '')))];
const creditLine =
  `Images: ${script.imageCredit ?? 'Wikimedia Commons'} · public domain / CC0. ` +
  (films.length ? `Film: ${films.join('; ')} · public domain. ` : '') +
  `Music: ${tracks.map((t) => t.tr.credit).join('; ')}. Maps and numbers: schematic, after ${script.mapSource ?? 'ancient and modern sources'}. Sources: Wikipedia.`;

const resolved = {
  ...script,
  voice: script.voice ?? channel.voice,
  speed: script.speed ?? 1.0,
  tail: script.tail ?? 0.8,
  sentences: [...script.sentences, { id: 'end2', say: stage.say, show: stage.say, pauseAfter: 0.5 }],
  scenes: [
    ...script.scenes,
    { id: 'endcard', type: 'endcard', from: 'end2', enter: 'fade', image: script.endImage, card: stage, credits: creditLine, storyAt: 'end2+0.05', ctaAt: 'end2+0.4' },
  ],
  captionsUntil: 'end2',
};
const words = resolved.sentences.reduce((n, s) => n + s.say.split(/\s+/).length, 0);
console.log(`${script.sentences.length} sentences + end card · ${words} words · ${script.scenes.length + 1} scenes · music ${tracks.map((t) => t.tr.id).join(' → ')} · cta: "${stage.say}"`);

// ── 2–4. audio ────────────────────────────────────────────────────────────
/** One bed from several tracks, crossfaded — a 5-minute video outlasts any single piece. */
function buildBed(total) {
  const X = 6;
  const bed = path.join(dir, 'bed.wav');
  const inputs = [];
  const chains = [];
  let sum = 0;
  tracks.forEach((t, i) => {
    const full = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', t.file], { encoding: 'utf8' }).trim());
    const start = t.start ?? 0;
    const len = Math.min(t.len ?? full - start, full - start);
    sum += len - (i ? X : 0);
    inputs.push('-ss', String(start), '-t', String(len), '-i', t.file);
    chains.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo[a${i}]`);
  });
  if (sum < total + 3) fail(`the music bed is ${sum.toFixed(0)}s but the video is ${total}s — add a track or a longer "len"`);
  let last = 'a0';
  for (let i = 1; i < tracks.length; i++) {
    chains.push(`[${last}][a${i}]acrossfade=d=${X}:c1=tri:c2=tri[x${i}]`);
    last = `x${i}`;
  }
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', chains.join(';'), '-map', `[${last}]`, '-ar', '48000', bed], { stdio: 'inherit' });
  return bed;
}

let timings;
if (!renderOnly) {
  step('voice');
  const made = voice(dir, resolved);
  console.log(`${made} sentence(s) voiced, ${resolved.sentences.length - made} unchanged`);
  step('narrate');
  timings = narration(dir, resolved);
  const len = videoLength(resolved, timings);
  console.log(`narration ${timings.total}s → video ${len}s`);
  if (len > MAX_LEN) fail(`video is ${len}s — over ${MAX_LEN}s. Cut about ${Math.ceil((len - 300) * 2.5)} words.`);
  if (len < MIN_LEN) fail(`video is ${len}s — under ${MIN_LEN}s. Add about ${Math.ceil((MIN_LEN + 20 - len) * 2.5)} words.`);
  step('mix');
  const bed = buildBed(len);
  mix(dir, resolved, timings, bed);
  console.log(`mix.wav — ${tracks.map((t) => t.tr.id).join(' → ')}`);
} else {
  timings = JSON.parse(readFileSync(path.join(dir, 'timings.json'), 'utf8'));
}
const total = videoLength(resolved, timings);

// ── 5. compose ────────────────────────────────────────────────────────────
step('compose');
let composed;
try {
  composed = composeWide(dir, resolved, timings, total);
} catch (e) {
  fail(e.stack?.split('\n').slice(0, 4).join('\n') ?? e.message);
}
if (args.includes('--says')) {
  for (const sc of resolved.scenes) {
    const s = composed.scene[sc.id];
    const said = timings.sentences.filter((t) => Math.min(t.end, s.end) - Math.max(t.start, s.start) > 0.5).map((t) => `"${t.show}"`).join(' ');
    console.log(`  ${sc.id.padEnd(9)} ${s.start.toFixed(1)}→${s.end.toFixed(1)}  ${sc.type} · ${sc.image ?? sc.clip ?? sc.map ?? ''}\n           says: ${said}`);
  }
}
if (composed.problems.length) fail(composed.problems.join('\n  '));

// ── 6. check ──────────────────────────────────────────────────────────────
step('check');
let report = '';
try {
  report = npx(['check', '--timeout', '180000', '--samples', '14'], { stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  report = `${e.stdout ?? ''}${e.stderr ?? ''}`;
}
const errors = [...report.matchAll(/(\d+) error\(s\)/g)].reduce((n, m) => n + Number(m[1]), 0);
const blocking = report.split('\n').filter((l) => /✗|error:/i.test(l) && !/0 error/.test(l)).slice(0, 25);
if (errors > 0 || /Check failed/.test(report)) fail(`hyperframes check found ${errors} error(s):\n${blocking.join('\n') || report.slice(-3000)}`);
console.log('check passed');

// ── 7. snapshot ───────────────────────────────────────────────────────────
if (!renderOnly) {
  step('snapshot');
  const at = [0.5, ...Object.values(composed.scene).map((s) => Math.min(s.end - 0.25, s.start + s.duration * 0.7))].map((t) => t.toFixed(2));
  npx(['snapshot', '--at', at.join(','), '--no-end', '--describe', 'false', '--timeout', '180000'], { stdio: ['ignore', 'pipe', 'pipe'] });
  console.log(`snapshots/contact-sheet*.jpg — ${at.length} frames`);
  console.log('LOOK at the contact sheet before rendering.');
}
if (noRender) {
  console.log('\n(stopped before render: --no-render)');
  process.exit(0);
}

// ── 8. render + verify ────────────────────────────────────────────────────
step('render');
const hdr = resolved.scenes
  .filter((sc) => sc.clip)
  .filter((sc) => /arib-std-b67|smpte2084|bt2020/.test(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=color_transfer', '-of', 'default=nw=1:nk=1', path.join(dir, 'assets', sc.clip)], { encoding: 'utf8' }).trim()))
  .map((sc) => sc.clip);
if (hdr.length) fail(`HDR video in ${[...new Set(hdr)].join(', ')} — tone-map it to bt709 first`);
const name = `${script.slug}${draft ? '-draft' : ''}`;
const mp4 = path.join(dir, 'renders', `${name}.mp4`);
mkdirSync(path.dirname(mp4), { recursive: true });
npx(['render', '--quality', 'high', '--browser-timeout', '600', '--output', path.relative(dir, mp4)], { stdio: ['ignore', 'pipe', 'pipe'] });
{
  const remux = mp4.replace(/\.mp4$/, '.remux.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-i', path.join(dir, 'mix.wav'), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', remux]);
  renameSync(remux, mp4);
}
const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', mp4], { encoding: 'utf8' }).trim());
const loud = spawnSync('ffmpeg', ['-hide_banner', '-i', mp4, '-af', 'loudnorm=print_format=summary', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).stderr;
const lufs = Number(/Input Integrated:\s*(-?[\d.]+)/.exec(loud)?.[1]);
if (Math.abs(dur - total) > 0.3) fail(`rendered ${dur.toFixed(2)}s but the timeline is ${total}s`);
if (!(lufs > -16 && lufs < -12)) fail(`loudness ${lufs} LUFS — expected about -14`);
// A render that freezes shows the first frame for a long stretch: warn if a later scene looks like frame 0.
const first = resolved.scenes[0];
const frozen = Object.entries(composed.scene)
  .filter(([id]) => id !== first.id)
  .map(([id, s]) => [id, s.start + s.duration / 2])
  .filter(([, t]) => t > 2)
  .filter(([id, t]) => {
    const sc = resolved.scenes.find((x) => x.id === id);
    if ((sc.image && sc.image === first.image) || (sc.clip && sc.clip === first.clip)) return false;
    const out = spawnSync('ffmpeg', ['-hide_banner', '-ss', '0.6', '-i', mp4, '-ss', t.toFixed(2), '-i', mp4, '-filter_complex', '[0:v][1:v]psnr', '-frames:v', '1', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).stderr;
    const psnr = /average:(inf|[\d.]+)/.exec(out)?.[1];
    return psnr === 'inf' || Number(psnr) > 24;
  });
if (frozen.length) console.warn(`⚠ these scenes look like the first frame — did the render freeze? ${frozen.map(([id, t]) => `${id} (${t.toFixed(0)}s)`).join(', ')}`);
const cover = path.join(dir, 'renders', 'cover.jpg');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '1.0', '-i', mp4, '-frames:v', '1', '-q:v', '2', cover]);
console.log(`${path.relative(videoDir, mp4)} — ${dur.toFixed(1)}s · ${lufs} LUFS`);

// ── 9. deliver ────────────────────────────────────────────────────────────
step('deliver');
const ready = path.join(ohDir, 'ready', name);
mkdirSync(ready, { recursive: true });
copyFileSync(mp4, path.join(ready, `${name}.mp4`));
copyFileSync(cover, path.join(ready, 'cover.jpg'));
{
  const py = process.env.HYPERFRAMES_PYTHON || 'python';
  const r = spawnSync(py, [path.join(ohDir, 'make_thumb_wide.py'), '--clip', dir, path.join(ready, 'thumbnail.jpg')], { encoding: 'utf8' });
  console.log(r.status === 0 ? 'thumbnail.jpg — designed 1280×720 thumbnail' : '⚠ thumbnail failed: ' + (r.stderr || r.stdout || '').slice(-400));
}
const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const seg = Object.fromEntries(timings.sentences.map((s) => [s.id, s]));
const chapters = (script.chapters ?? []).map((c, i) => `${i === 0 ? '0:00' : clock(seg[c.at]?.start ?? 0)} ${c.title}`);
const post = script.post ?? {};
const yt = post.youtube ?? {};
writeFileSync(
  path.join(ready, 'POST.md'),
  [
    `# The Old History — ${script.title ?? script.slug}`,
    '',
    `Video: ${name}.mp4 (${clock(dur)}, 16:9 1920×1080) · thumbnail.jpg (1280×720) · cover.jpg = a frame`,
    '',
    '## Facebook (The Old History page — post the video file or the YouTube link)',
    '',
    post.facebook ?? '(missing — write "post.facebook" in script.json)',
    '',
    '## YouTube',
    '',
    `Title: ${yt.title ?? '(missing — write "post.youtube.title")'}`,
    '',
    'Description:',
    '',
    `${yt.description ?? '(missing — write "post.youtube.description")'}`,
    '',
    ...(chapters.length ? ['Chapters (paste into the description — the first must be 0:00):', '', ...chapters, ''] : []),
    `Tags: ${(yt.tags ?? []).join(', ') || '(missing)'}`,
    '',
    'Settings: upload as a normal video (16:9) · Audience: No, not made for kids · Category: Education · Altered or synthetic content: No (synthetic narrator, no real person imitated; the battle map is a labelled schematic) · Thumbnail: thumbnail.jpg · Add the end-screen "Subscribe" element in YouTube Studio.',
    '',
    ...(post.pinned ? ['## Pinned comment', '', post.pinned, ''] : []),
    '## Sources',
    '',
    ...(script.sources ?? []).map((s) => `- ${s}`),
    '',
  ].join('\n'),
);
if (!draft) {
  const log = existsSync(ohLog) ? JSON.parse(readFileSync(ohLog, 'utf8')) : [];
  const entry = { slug: script.slug, made: script.date, title: script.title ?? script.slug, music: tracks.map((t) => t.tr.id).join('+'), seconds: Math.round(dur), cta: stage.say };
  const at = log.findIndex((l) => l.slug === script.slug);
  if (at === -1) log.push(entry);
  else log[at] = entry;
  writeFileSync(ohLog, JSON.stringify(log, null, 2) + '\n');
}
console.log(`ready → ${path.relative(path.resolve(videoDir, '..'), ready)}`);
