/**
 * Step 3: script.json → a finished, checked video, in one command.
 *
 *   node video/tools/make.mjs video/day-2026-09-26-petrov                 everything
 *   node video/tools/make.mjs video/day-2026-09-26-petrov --no-render     stop after the snapshots
 *   node video/tools/make.mjs video/day-2026-09-26-petrov --render-only   frames already approved
 *
 *   1. resolve   add the end card and its two spoken lines from channel.json,
 *                the music from music/library.json; check every image exists
 *   2. voice     Kokoro, one WAV per sentence (only the changed ones)
 *   3. narrate   join + time + -14 LUFS; the length must land in 45–62s
 *   4. mix       music bed, ducked under the voice
 *   5. compose   index.html from the scene library
 *   6. check     hyperframes lint + layout; any error stops here
 *   7. snapshot  the cover and every scene → snapshots/contact-sheet.jpg — LOOK AT IT
 *   8. render    high quality, then verify length and loudness, cut cover.jpg
 *   9. deliver   video/ready/<date>-<slug>/ : the mp4, cover.jpg, POST.md
 *                and one line in video/log.json
 *
 * Exits non-zero with the reason on anything that would ship a broken video.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HYPERFRAMES, mix, narration, videoLength, voice } from './lib/audio.mjs';
import { compose } from './lib/compose.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const videoDir = path.resolve(here, '..');
const args = process.argv.slice(2);
const dayArg = args.find((a) => !a.startsWith('--'));
if (!dayArg) {
  console.error('usage: node video/tools/make.mjs <day folder> [--no-render | --render-only]');
  process.exit(1);
}
const dir = path.resolve(dayArg);
const noRender = args.includes('--no-render');
const renderOnly = args.includes('--render-only');
const MIN_LEN = 45;
const MAX_LEN = 62;

const fail = (msg) => {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
};
const step = (s) => console.log(`\n── ${s}`);
const npx = (cmdArgs, opts = {}) =>
  execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['-y', HYPERFRAMES, ...cmdArgs], {
    cwd: dir,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });

// ── 1. resolve ────────────────────────────────────────────────────────────
step('resolve');
const script = JSON.parse(readFileSync(path.join(dir, 'script.json'), 'utf8'));
const channel = JSON.parse(readFileSync(path.join(videoDir, 'channel.json'), 'utf8'));
const library = JSON.parse(readFileSync(path.join(videoDir, 'music', 'library.json'), 'utf8'));
if (script.format !== 2) fail('script.json is not format 2 — the hand-built days use build-*.mjs instead');

const stage = channel.stages[channel.stage];
if (!stage) fail(`channel.json stage "${channel.stage}" has no entry in "stages"`);
const track = library.tracks.find((t) => t.id === script.music?.track);
if (!track) fail(`music.track "${script.music?.track}" is not in music/library.json`);
const musicFile = path.join(videoDir, 'music', track.file);
if (!existsSync(musicFile)) fail(`${track.file} is missing — run node video/tools/fetch-music.mjs`);

for (const [k, v] of Object.entries({ date: script.date, slug: script.slug, cover: script.cover })) {
  if (!v) fail(`script.json needs "${k}"`);
}
const ids = new Set();
for (const s of script.sentences) {
  if (ids.has(s.id)) fail(`two sentences share the id "${s.id}"`);
  ids.add(s.id);
  if (!s.say || !s.show) fail(`sentence ${s.id} needs both "say" and "show"`);
  if (/\d/.test(s.say)) fail(`sentence ${s.id} "say" has digits — spell numbers out for the voice ("${s.say}")`);
}
script.scenes.forEach((sc, i) => {
  sc.id ??= `scene${i + 1}`;
  if (i > 0 && !ids.has(sc.from)) fail(`${sc.id} opens on "${sc.from}", which is not a sentence id`);
});

// Credits: the artists recorded when each image was fetched.
const creditsFile = path.join(dir, 'assets', 'credits.json');
const credits = existsSync(creditsFile) ? JSON.parse(readFileSync(creditsFile, 'utf8')) : {};
const artists = [
  ...new Set(
    Object.values(credits)
      .map((c) => (c.artist ?? '').replace(/\s*\(.*?\)\s*/g, ' ').trim())
      .filter((a) => a && a.length <= 40 && !/unknown|anonymous|unidentified|^user:/i.test(a)),
  ),
].slice(0, 4);
const creditLine =
  `Images: ${script.imageCredit ?? (artists.length ? `${artists.join('; ')} via Wikimedia Commons` : 'Wikimedia Commons')} · public domain. ` +
  `Music: ${track.credit}. Sources: Wikipedia.`;

// The end card and its two spoken lines come from the channel settings, so a
// stage change (pre-launch → closed test → launch) reaches every video.
const resolved = {
  ...script,
  voice: script.voice ?? channel.voice,
  speed: script.speed ?? channel.speed,
  tail: script.tail ?? channel.tail,
  sentences: [
    ...script.sentences,
    { id: 'end1', say: channel.story, show: channel.story, pauseAfter: 0.35 },
    { id: 'end2', say: stage.say, show: stage.say, pauseAfter: 0.5 },
  ],
  scenes: [
    ...script.scenes,
    {
      id: 'endcard',
      type: 'endcard',
      from: 'end1',
      enter: 'fade',
      image: script.endImage,
      card: { story: channel.story, ...stage },
      credits: creditLine,
      storyAt: 'end1+0.05',
      ctaAt: 'end2',
    },
  ],
  captionsUntil: 'end1',
};
const words = resolved.sentences.reduce((n, s) => n + s.say.split(/\s+/).length, 0);
console.log(`${script.sentences.length} story sentences + end card · ${words} words · ${script.scenes.length + 1} scenes · music ${track.id} · stage ${channel.stage}`);

// ── 2–4. audio ────────────────────────────────────────────────────────────
let timings;
if (!renderOnly) {
  step('voice');
  const made = voice(dir, resolved);
  console.log(`${made} sentence(s) voiced, ${resolved.sentences.length - made} unchanged`);

  step('narrate');
  timings = narration(dir, resolved);
  const len = videoLength(resolved, timings);
  console.log(`narration ${timings.total}s → video ${len}s`);
  for (const t of timings.sentences) console.log(`  ${t.id.padEnd(6)} ${t.start.toFixed(2)} → ${t.end.toFixed(2)}`);
  if (len > MAX_LEN) fail(`video is ${len}s — over ${MAX_LEN}s. Cut about ${Math.ceil((len - 58) * 2.2)} words or shorten pauses, then run again.`);
  if (len < MIN_LEN) fail(`video is ${len}s — under ${MIN_LEN}s. Add a sentence of story (about ${Math.ceil((52 - len) * 2.2)} words).`);

  step('mix');
  mix(dir, resolved, timings, musicFile);
  console.log(`mix.wav — ${track.id}`);
} else {
  timings = JSON.parse(readFileSync(path.join(dir, 'timings.json'), 'utf8'));
}
const total = videoLength(resolved, timings);

// ── 5. compose ────────────────────────────────────────────────────────────
step('compose');
let composed;
try {
  composed = compose(dir, resolved, timings, total);
} catch (e) {
  fail(e.message);
}
for (const [id, s] of Object.entries(composed.scene)) console.log(`  ${id.padEnd(8)} ${s.start.toFixed(2)} → ${s.end.toFixed(2)}`);
if (composed.problems.length) fail(composed.problems.join('\n  '));

// ── 6. check ──────────────────────────────────────────────────────────────
step('check');
let report = '';
try {
  report = npx(['check'], { stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  report = `${e.stdout ?? ''}${e.stderr ?? ''}`;
}
const errors = [...report.matchAll(/(\d+) error\(s\)/g)].reduce((n, m) => n + Number(m[1]), 0);
const blocking = report
  .split('\n')
  .filter((l) => /✗|error:/i.test(l) && !/0 error/.test(l))
  .slice(0, 20);
if (errors > 0 || /Check failed/.test(report)) fail(`hyperframes check found ${errors} error(s):\n${blocking.join('\n') || report.slice(-3000)}`);
console.log('check passed');

// ── 7. snapshot ───────────────────────────────────────────────────────────
if (!renderOnly) {
  step('snapshot');
  const at = [0.2, ...Object.values(composed.scene).map((s) => Math.min(s.end - 0.25, s.start + s.duration * 0.65))].map((t) => t.toFixed(2));
  npx(['snapshot', '--at', at.join(','), '--no-end', '--describe', 'false'], { stdio: ['ignore', 'pipe', 'pipe'] });
  console.log(`snapshots/contact-sheet.jpg — cover + ${at.length - 1} scenes at ${at.join(', ')}s`);
  console.log('LOOK at the contact sheet before rendering: cropped faces, unreadable text, a dull cover.');
}
if (noRender) {
  console.log('\n(stopped before render: --no-render)');
  process.exit(0);
}

// ── 8. render + verify ────────────────────────────────────────────────────
step('render');
const name = `${script.date}-${script.slug}`;
const mp4 = path.join(dir, 'renders', `${name}.mp4`);
mkdirSync(path.dirname(mp4), { recursive: true });
npx(['render', '--quality', 'high', '--output', path.relative(dir, mp4)], { stdio: ['ignore', 'pipe', 'pipe'] });
const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', mp4], { encoding: 'utf8' }).trim());
// loudnorm prints its measurement on stderr.
const loud = spawnSync('ffmpeg', ['-hide_banner', '-i', mp4, '-af', 'loudnorm=print_format=summary', '-f', 'null', '-'], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024,
}).stderr;
const lufs = Number(/Input Integrated:\s*(-?[\d.]+)/.exec(loud)?.[1]);
if (Math.abs(dur - total) > 0.3) fail(`rendered ${dur.toFixed(2)}s but the timeline is ${total}s`);
if (!(lufs > -16 && lufs < -12)) fail(`loudness ${lufs} LUFS — expected about -14`);
const cover = path.join(dir, 'renders', 'cover.jpg');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '0.1', '-i', mp4, '-frames:v', '1', '-q:v', '2', cover]);
console.log(`${path.relative(videoDir, mp4)} — ${dur.toFixed(1)}s · ${lufs} LUFS · cover.jpg`);

// ── 9. deliver ────────────────────────────────────────────────────────────
step('deliver');
const ready = path.join(videoDir, 'ready', name);
mkdirSync(ready, { recursive: true });
copyFileSync(mp4, path.join(ready, `${name}.mp4`));
copyFileSync(cover, path.join(ready, 'cover.jpg'));
const post = script.post ?? {};
writeFileSync(
  path.join(ready, 'POST.md'),
  [
    `# ${script.date} — ${script.title ?? script.slug}`,
    '',
    `Video: ${name}.mp4 (${dur.toFixed(0)}s) · cover: cover.jpg (also the first frame)`,
    '',
    '## TikTok',
    '',
    post.tiktok ?? '(missing — write "post.tiktok" in script.json)',
    '',
    '## Facebook',
    '',
    post.facebook ?? '(missing — write "post.facebook" in script.json)',
    '',
    '## Sources',
    '',
    ...(script.sources ?? []).map((s) => `- ${s}`),
    '',
  ].join('\n'),
);
const logFile = path.join(videoDir, 'log.json');
const log = existsSync(logFile) ? JSON.parse(readFileSync(logFile, 'utf8')) : [];
const entry = {
  date: script.date,
  slug: script.slug,
  title: script.title ?? script.slug,
  eventId: script.eventId ?? null,
  category: script.category ?? null,
  music: track.id,
  seconds: Math.round(dur),
};
const at = log.findIndex((l) => l.date === script.date);
if (at === -1) log.push(entry);
else log[at] = entry;
log.sort((a, b) => a.date.localeCompare(b.date));
writeFileSync(logFile, JSON.stringify(log, null, 2) + '\n');
if (!post.tiktok || !post.facebook) console.log('⚠ POST.md is missing a caption — add "post" to script.json');
console.log(`ready → ${path.relative(path.resolve(videoDir, '..'), ready)}`);
