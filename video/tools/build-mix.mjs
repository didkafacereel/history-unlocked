/**
 * Lay a music bed under the narration, ducked whenever the voice speaks.
 *
 *   node ../tools/build-mix.mjs      (run inside a day's project folder, after
 *                                     build-narration.mjs)
 *
 * Reads  script.json  → "music": { file, start?, levelLufs? }, "tail"
 *        timings.json, narration.wav
 * Writes mix.wav — the one audio track the composition plays
 *
 * The user asked for music that is "not loud, easy on the ear". So the bed is
 * quiet to begin with (levelLufs, default -31) and is pushed further down by a
 * sidechain compressor keyed on the voice: under speech it sits well below the
 * words, and in the pauses between phrases it rises back to its own level. The
 * voice is never fighting it, and the silences are never dead.
 *
 * The mix runs the length of the whole video, not just the speech, so the
 * music carries the end card and fades out with the picture.
 *
 * LICENCE RULE: only recordings in the public domain or CC0 — the composition
 * AND the performance. A TikTok, Reels or Shorts upload with an unlicensed
 * track gets muted or claimed, and that is the end of a video's reach. See
 * ../music/LIBRARY.md.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const script = JSON.parse(readFileSync('script.json', 'utf8'));
const timings = JSON.parse(readFileSync('timings.json', 'utf8'));
const music = script.music;

if (!music?.file) {
  throw new Error('script.json has no "music.file"');
}
if (!existsSync(music.file)) {
  throw new Error(`music file not found: ${music.file}`);
}

const last = timings.sentences[timings.sentences.length - 1];
const total = Math.round((last.end + (script.tail ?? 0.9)) * 1000) / 1000;
const start = music.start ?? 0;
/*
 * The bed is set to a LOUDNESS, not a gain. A fixed -17 dB was the first
 * version, and it measured -51 LUFS on this quiet piano recording — 37 dB
 * under the voice, which is silence. Recordings differ by 20 dB and more, so
 * each is normalised to the same level before it goes under the voice:
 * -31 LUFS sits 17 dB below the -14 narration — present in the pauses, never
 * competing with a word — and the ducking takes it lower still under speech.
 */
const level = music.levelLufs ?? -31;
const fadeOut = 2.5;

const filter = [
  `[1:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=${level}:TP=-6:LRA=11,` +
    `afade=t=in:st=0:d=1.5,afade=t=out:st=${(total - fadeOut).toFixed(3)}:d=${fadeOut}[bed]`,
  `[0:a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=${total},asplit=2[voice][key]`,
  // Duck the bed by the voice: fast attack so the first syllable is clear,
  // slow release so the music swells back gently rather than pumping.
  `[bed][key]sidechaincompress=threshold=0.015:ratio=8:attack=12:release=450[ducked]`,
  `[voice][ducked]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[out]`,
].join(';');

execFileSync(
  'ffmpeg',
  [
    '-y',
    '-v',
    'error',
    '-i',
    'narration.wav',
    '-ss',
    String(start),
    '-t',
    String(total),
    '-i',
    music.file,
    '-filter_complex',
    filter,
    '-map',
    '[out]',
    '-ar',
    '48000',
    '-t',
    String(total),
    'mix.wav',
  ],
  { stdio: 'inherit' },
);

console.log(`mix.wav ${total}s — ${music.file} from ${start}s at ${level} LUFS, ducked under the voice`);
