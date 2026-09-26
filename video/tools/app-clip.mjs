/**
 * The in-app version of a day's video (planned for app update 1.1, hosted on
 * Cloudflare R2): the same film, cut before the TikTok end card — whose
 * "subscribe to find out when our app comes out" is nonsense to someone who
 * is already in the app — faded out, and encoded small enough to stream.
 *
 *   node video/tools/app-clip.mjs <day folder> [path to the rendered mp4]
 *
 * make.mjs calls `makeAppClip` after every render, so the nightly run keeps
 * the collection growing; run this by hand to backfill a day made earlier.
 *
 * Writes video/app-clips/<date>-<slug>.mp4 and updates app-clips/index.json.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const videoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FADE = 0.6;

/**
 * Where the end card begins, from the measured narration: the first end-card
 * sentence ("Every day has a story like this."). Automated days name it
 * `end1`; the two hand-built days name it in `captionsUntil`.
 */
function endCardStart(dir, script) {
  const timings = JSON.parse(readFileSync(path.join(dir, 'timings.json'), 'utf8'));
  const id = script.format === 2 ? 'end1' : script.captionsUntil;
  const s = timings.sentences.find((t) => t.id === id);
  if (!s) throw new Error(`no end-card sentence "${id}" in ${dir}/timings.json`);
  // Just before the words, and before the crossfade into the card.
  return Math.max(10, s.start - 0.4);
}

export function makeAppClip(dir, mp4, meta) {
  const script = JSON.parse(readFileSync(path.join(dir, 'script.json'), 'utf8'));
  const cut = endCardStart(dir, script);
  const outDir = path.join(videoDir, 'app-clips');
  mkdirSync(outDir, { recursive: true });
  const name = `${meta.date}-${meta.slug}`;
  const out = path.join(outDir, `${name}.mp4`);
  execFileSync('ffmpeg', [
    '-v', 'error', '-y', '-i', mp4, '-t', cut.toFixed(2),
    '-vf', `scale=720:-2,fade=t=out:st=${(cut - FADE).toFixed(2)}:d=${FADE}`,
    '-af', `afade=t=out:st=${(cut - FADE).toFixed(2)}:d=${FADE}`,
    '-c:v', 'libx264', '-crf', '28', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', out,
  ]);
  // A still for the card before it plays: the cover frame.
  const poster = path.join(outDir, `${name}.jpg`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '0.1', '-i', mp4, '-frames:v', '1', '-vf', 'scale=720:-2', '-q:v', '4', poster]);

  const indexFile = path.join(outDir, 'index.json');
  const index = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : [];
  const entry = {
    date: meta.date,
    dateKey: meta.date.slice(5),
    slug: meta.slug,
    eventId: meta.eventId ?? null,
    title: meta.title ?? meta.slug,
    seconds: Math.round(cut * 10) / 10,
    video: `${name}.mp4`,
    poster: `${name}.jpg`,
    bytes: statSync(out).size,
  };
  const at = index.findIndex((e) => e.date === meta.date);
  if (at === -1) index.push(entry);
  else index[at] = entry;
  index.sort((a, b) => a.date.localeCompare(b.date));
  writeFileSync(indexFile, JSON.stringify(index, null, 2) + '\n');
  return entry;
}

// ── command line (backfill) ─────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [dayArg, mp4Arg] = process.argv.slice(2);
  if (!dayArg) {
    console.error('usage: node video/tools/app-clip.mjs <day folder> [rendered mp4]');
    process.exit(1);
  }
  const dir = path.resolve(dayArg);
  const script = JSON.parse(readFileSync(path.join(dir, 'script.json'), 'utf8'));
  const log = JSON.parse(readFileSync(path.join(videoDir, 'log.json'), 'utf8'));
  const slugFromDir = path.basename(dir).replace(/^day-(\d{4}-\d\d-\d\d-)?\d*-?/, '');
  const meta =
    log.find((l) => l.date === script.date) ??
    log.find((l) => dir.includes(l.slug)) ?? { date: script.date, slug: script.slug ?? slugFromDir };
  const mp4 =
    mp4Arg ??
    (() => {
      const renders = path.join(dir, 'renders');
      const files = readdirSync(renders).filter((f) => f.endsWith('.mp4'));
      const pick = files.find((f) => f.startsWith('TikTok-')) ?? files.find((f) => f.startsWith(meta.date)) ?? files[0];
      if (!pick) throw new Error(`no rendered mp4 in ${renders}`);
      return path.join(renders, pick);
    })();
  const e = makeAppClip(dir, mp4, { ...meta, eventId: meta.eventId ?? script.eventId, title: meta.title ?? script.title });
  console.log(`app-clips/${e.video} — ${e.seconds}s, ${(e.bytes / 1e6).toFixed(1)} MB (cut before the end card)`);
}
