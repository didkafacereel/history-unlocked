/**
 * Step 3: script.json → a finished, checked video, in one command.
 *
 *   node video/tools/make.mjs video/day-2026-09-26-petrov                 everything
 *   node video/tools/make.mjs video/day-2026-09-26-petrov --no-render     stop after the snapshots
 *   node video/tools/make.mjs video/day-2026-09-26-petrov --render-only   frames already approved
 *   … --draft   a trial version: delivered to ready/, but not logged and no app clip
 *
 * "pace": "fast" in script.json (the v2 format): voice at 1.0, 40–70 s (35–75 accepted), a
 * picture change every 2–3 s, lighter shades, 3-word captions, and only the
 * call-to-action line spoken over the end card.
 *
 *   1. resolve   add the end card and its two spoken lines from channel.json,
 *                the music from music/library.json; check every image exists
 *   2. voice     Kokoro, one WAV per sentence (only the changed ones)
 *   3. narrate   join + time + -14 LUFS; the length must land in 45–62s
 *   4. mix       music bed, ducked under the voice
 *   5. compose   index.html from the scene library
 *   6. check     hyperframes lint + layout; any error stops here
 *   7. snapshot  the cover and every scene → snapshots/contact-sheet*.jpg — LOOK AT IT
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
import { makeAppClip } from './app-clip.mjs';

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
const draft = args.includes('--draft');

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
const fast = script.pace === 'fast';
const MIN_LEN = fast ? 35 : 45;
const MAX_LEN = fast ? 75 : 62;
const TARGET = fast ? 58 : 58;

const stageBase = channel.stages[channel.stage];
if (!stageBase) fail(`channel.json stage "${channel.stage}" has no entry in "stages"`);
// A new call to action for every video (the user, 3 Oct: "be super
// innovative and creative with the CTA" — the clips also go to YouTube).
// script.json "cta": { story, say, pill, note } is written for the day's
// story; it must still ask to subscribe and point at the coming app. The
// stage's "ctas" list is only a fallback, rotated by date.
const ctas = stageBase.ctas ?? [];
const dayNumber = Math.round((Date.parse(script.date) - Date.parse('2026-01-01')) / 864e5);
const custom = script.cta && typeof script.cta === 'object' ? script.cta : null;
const ctaIndex = custom ? -1 : ctas.length ? ((Number.isInteger(script.cta) ? script.cta : dayNumber) % ctas.length + ctas.length) % ctas.length : -1;
const { ctas: _variants, '//ctas': _note, ...stageFields } = stageBase;
const stage = { story: channel.story, ...stageFields, ...(custom ?? ctas[ctaIndex] ?? {}) };
if (custom) {
  for (const k of ['story', 'say', 'pill', 'note']) if (!custom[k]) fail(`script.json "cta" needs "${k}"`);
  if (/\d/.test(custom.say)) fail('cta.say has digits — spell numbers out for the voice');
  if (!/subscri/i.test(custom.say) || !/\bapp\b/i.test(custom.say + ' ' + custom.note)) {
    fail('cta must still ask to subscribe (in "say") and mention the coming app (in "say" or "note")');
  }
  if (custom.pill.length > 16) fail(`cta.pill "${custom.pill}" is over 16 characters — it must fit the button`);
  if (custom.say.split(/\s+/).length > 22) fail('cta.say is over 22 words — keep the end card short');
  const prior = (existsSync(path.join(videoDir, 'log.json')) ? JSON.parse(readFileSync(path.join(videoDir, 'log.json'), 'utf8')) : [])
    .filter((l) => l.date !== script.date && l.cta);
  if (prior.some((l) => l.cta.toLowerCase() === custom.say.toLowerCase())) fail('this cta.say was already used on an earlier day — write a new one');
}
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
  // "s4", or a cue inside it ("s4@0.5", "s4+0.8") for a cut mid-sentence.
  if (i > 0 && !ids.has(String(sc.from ?? '').replace(/[@+-].*$/, ''))) fail(`${sc.id} opens on "${sc.from}", which is not a sentence id or a cue on one`);
});

// Credits: the artists recorded when each image was fetched.
const creditsFile = path.join(dir, 'assets', 'credits.json');
const credits = existsSync(creditsFile) ? JSON.parse(readFileSync(creditsFile, 'utf8')) : {};
// Only the pictures that are actually on screen — a file fetched and then
// replaced must not be credited for a video it is not in.
const usedImages = new Set(
  [
    script.cover?.image,
    script.endImage,
    ...script.scenes.flatMap((sc) => [sc.image, sc.a?.image, sc.b?.image, sc.clip]),
    script.also?.image,
  ].filter(Boolean),
);
const artists = [
  ...new Set(
    Object.entries(credits)
      .filter(([file, c]) => usedImages.has(file) && !c.film)
      .map(([, c]) => c)
      .map((c) => (c.artist ?? '').replace(/^\s*copyright\s+(by\s+)?/i, '').replace(/\s*\(.*?\)\s*/g, ' ').trim())
      .filter((a) => a && a.length <= 40 && !/unknown|anonymous|unidentified|^user:/i.test(a)),
  ),
].slice(0, 8);
// Archive film is credited by its title ("How To Fly The B-26"), once per film.
const films = [
  ...new Set(
    Object.entries(credits)
      .filter(([file, c]) => usedImages.has(file) && c.film)
      .map(([, c]) => c.file.replace(/^File:/, '').replace(/.(webm|ogv|mpe?g|mp4)$/i, '')),
  ),
];
const creditLine =
  `Images: ${script.imageCredit ?? (artists.length ? `${artists.join('; ')} via Wikimedia Commons` : 'Wikimedia Commons')} · public domain. ` +
  (films.length ? `Film: ${films.join('; ')} · public domain. ` : '') +
  `Music: ${track.credit}. Sources: Wikipedia.`;

// "Also on this day" (the user, 3 Oct): the day's other events, spoken in one
// sentence and listed on their own card just before the call to action.
const also = script.also ?? null;
if (also) {
  if (!also.say || !Array.isArray(also.items) || !also.items.length) fail('script.json "also" needs "say" and 1–3 "items" ({ year, text })');
  if (/\d/.test(also.say)) fail(`also.say has digits — spell numbers out for the voice ("${also.say}")`);
  if (also.items.length > 3) fail('"also" takes at most 3 items');
  for (const it of also.items) if (!it.year || !it.text) fail('every "also" item needs "year" and "text"');
}
const dayLabel = new Date(`${script.date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });

// The end card and its two spoken lines come from the channel settings, so a
// stage change (pre-launch → closed test → launch) reaches every video.
const resolved = {
  ...script,
  voice: script.voice ?? channel.voice,
  speed: script.speed ?? (fast ? 1.0 : channel.speed),
  tail: script.tail ?? (fast ? 0.6 : channel.tail),
  // The fast pace speaks only the call to action — every second of end card
  // is a second viewers swipe away in, and completion is what TikTok counts.
  sentences: [
    ...script.sentences,
    ...(also ? [{ id: 'also', say: also.say, show: also.show ?? also.say, pauseAfter: also.pauseAfter ?? 0.45 }] : []),
    ...(fast ? [] : [{ id: 'end1', say: stage.story, show: stage.story, pauseAfter: 0.35 }]),
    { id: 'end2', say: stage.say, show: stage.say, pauseAfter: 0.5 },
  ],
  scenes: [
    ...script.scenes,
    ...(also
      ? [{
          id: 'alsocard',
          type: 'also',
          from: 'also',
          enter: 'cut',
          kicker: also.kicker ?? `Also on ${dayLabel}`,
          items: also.items,
          image: also.image,
          focus: also.focus,
          itemsFrom: also.itemsFrom ?? 'also@0.12',
          itemsTo: also.itemsTo ?? 'also@0.75',
        }]
      : []),
    {
      id: 'endcard',
      type: 'endcard',
      from: fast ? 'end2' : 'end1',
      enter: 'fade',
      image: script.endImage,
      card: stage,
      credits: creditLine,
      storyAt: fast ? 'end2+0.05' : 'end1+0.05',
      ctaAt: fast ? 'end2+0.3' : 'end2',
    },
  ],
  captionsUntil: fast ? 'end2' : 'end1',
};
const words = resolved.sentences.reduce((n, s) => n + s.say.split(/\s+/).length, 0);
console.log(`${script.sentences.length} story sentences + end card · ${words} words · ${script.scenes.length + 1} scenes · music ${track.id} · stage ${channel.stage}${custom ? ` · cta (custom): "${stage.say}"` : ctaIndex >= 0 ? ` · cta ${ctaIndex}: "${stage.say}"` : ''}`);

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
  if (len > MAX_LEN) fail(`video is ${len}s — over ${MAX_LEN}s. Cut about ${Math.ceil((len - TARGET) * 2.2)} words or shorten pauses, then run again.`);
  if (len < MIN_LEN) fail(`video is ${len}s — under ${MIN_LEN}s. Add a sentence of story (about ${Math.ceil((MIN_LEN + 5 - len) * 2.2)} words).`);

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
// What is SAID while each scene is on screen, beside what it SHOWS — the check
// for a picture that contradicts the words (a name spoken over someone else's
// portrait). Read this next to the contact sheet.
for (const sc of resolved.scenes) {
  const s = composed.scene[sc.id];
  const pics = [sc.image, sc.a?.image, sc.b?.image, sc.clip].filter(Boolean).join(' + ') || '(text only)';
  const said = timings.sentences
    // Over half a second of the sentence inside the scene — the crossfade
    // overlap at each boundary is not "said over" the next picture.
    .filter((t) => Math.min(t.end, s.end) - Math.max(t.start, s.start) > 0.5)
    .map((t) => `"${t.show}"`)
    .join(' ');
  console.log(`  ${sc.id.padEnd(8)} ${s.start.toFixed(2)}→${s.end.toFixed(2)}  ${sc.type} · ${pics}\n           says: ${said}`);
}
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
  console.log(`snapshots/contact-sheet*.jpg — cover + ${at.length - 1} scenes at ${at.join(', ')}s`);
  console.log('LOOK at the contact sheet before rendering: cropped faces, unreadable text, a dull cover.');
}
if (noRender) {
  console.log('\n(stopped before render: --no-render)');
  process.exit(0);
}

// ── 8. render + verify ────────────────────────────────────────────────────
step('render');
const name = `${script.date}-${script.slug}${draft ? '-v2' : ''}`;
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
    // YouTube Shorts (the user, 3 Oct): title, description, tags, settings.
    '## YouTube',
    '',
    `Title: ${post.youtube?.title ?? '(missing — write "post.youtube.title" in script.json)'}`,
    '',
    'Description:',
    '',
    post.youtube?.description ?? '(missing — write "post.youtube.description" in script.json)',
    '',
    `Tags: ${(post.youtube?.tags ?? []).join(', ') || '(missing — write "post.youtube.tags")'}`,
    '',
    'Settings: upload as a Short (vertical, under 3 minutes) · Audience: No, not made for kids · Category: Education · Altered or synthetic content: No (the narrator is a synthetic voice but imitates no real person; archive footage is not altered) · Thumbnail: cover.jpg (or the first frame)',
    '',
    '## Sources',
    '',
    ...(script.sources ?? []).map((s) => `- ${s}`),
    '',
  ].join('\n'),
);
if (draft) {
  console.log(`draft: not logged, no app clip
ready → ${path.relative(path.resolve(videoDir, '..'), ready)}`);
  process.exit(0);
}
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
  cta: stage.say,
};
const at = log.findIndex((l) => l.date === script.date);
if (at === -1) log.push(entry);
else log[at] = entry;
log.sort((a, b) => a.date.localeCompare(b.date));
writeFileSync(logFile, JSON.stringify(log, null, 2) + '\n');
// The in-app version (app update 1.1): cut before the TikTok end card, 720p.
const clip = makeAppClip(dir, mp4, entry);
console.log(`app-clips/${clip.video} — ${clip.seconds}s, ${(clip.bytes / 1e6).toFixed(1)} MB for the app`);
if (!post.tiktok || !post.facebook || !post.youtube?.title) console.log('⚠ POST.md is missing a caption — add "post.tiktok", "post.facebook" and "post.youtube" to script.json');
console.log(`ready → ${path.relative(path.resolve(videoDir, '..'), ready)}`);
