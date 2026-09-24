/**
 * Join per-sentence narration into one track and record exactly when each
 * sentence is spoken.
 *
 *   node ../tools/build-narration.mjs      (run inside a day's project folder)
 *
 * Why per sentence: each sentence is synthesized to its own WAV, so its start
 * and end are KNOWN rather than recovered by speech recognition afterwards. The
 * captions sync to these numbers directly — no whisper model, no guessing, and
 * nothing that can drift when a word is misheard.
 *
 * Reads  script.json + audio/<id>.wav
 * Writes narration.wav + timings.json
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const LEAD_IN = 0.4; // silence before the first word; a hard start feels clipped

const script = JSON.parse(readFileSync('script.json', 'utf8'));

function duration(file) {
  const out = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file],
    { encoding: 'utf8' },
  );
  return Number.parseFloat(out.trim());
}

const probe = path.join('audio', `${script.sentences[0].id}.wav`);
const rate = execFileSync(
  'ffprobe',
  ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate', '-of', 'default=nw=1:nk=1', probe],
  { encoding: 'utf8' },
).trim();

const inputs = [];
const filters = [];
const timings = [];
let cursor = 0;
let n = 0;

const silence = (seconds) => {
  inputs.push('-f', 'lavfi', '-t', seconds.toFixed(3), '-i', `anullsrc=r=${rate}:cl=mono`);
  filters.push(`[${n}:a]`);
  n++;
  cursor += seconds;
};

silence(LEAD_IN);
for (const s of script.sentences) {
  const file = path.join('audio', `${s.id}.wav`);
  const d = duration(file);
  inputs.push('-i', file);
  filters.push(`[${n}:a]`);
  n++;
  timings.push({ id: s.id, show: s.show, start: +cursor.toFixed(3), end: +(cursor + d).toFixed(3) });
  cursor += d;
  silence(s.pauseAfter ?? 0.3);
}

/*
 * Loudness-normalised to -14 LUFS, the level TikTok, Reels and Shorts all aim
 * playback at. The raw voice measured -21 dB mean: in a feed where every other
 * clip is mastered loud, that reads as "this one is broken" and gets swiped
 * before the first sentence ends. loudnorm changes level only — the pauses,
 * and so every timing below, are untouched.
 */
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-v',
    'error',
    ...inputs,
    '-filter_complex',
    `${filters.join('')}concat=n=${n}:v=0:a=1,loudnorm=I=-14:TP=-1.5:LRA=11[out]`,
    '-map',
    '[out]',
    '-ar',
    '48000',
    'narration.wav',
  ],
  { stdio: 'inherit' },
);

const total = +cursor.toFixed(3);
writeFileSync('timings.json', JSON.stringify({ total, sentences: timings }, null, 2));
console.log(`narration.wav ${total}s`);
for (const t of timings) {
  console.log(`  ${t.id} ${t.start.toFixed(2)} → ${t.end.toFixed(2)}`);
}
