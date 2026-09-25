/**
 * The audio half of a day: voice each sentence, join them into one narration
 * with measured timings, and lay the music bed underneath.
 *
 * Shared by make.mjs (the automated days) and the older per-step scripts
 * (build-narration.mjs, build-mix.mjs) that the first hand-built days use.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const HYPERFRAMES = 'hyperframes@0.8.72';
const PYTHON = 'C:\\Users\\poten\\AppData\\Local\\Programs\\Python\\Python313\\python.exe';
const LEAD_IN = 0.4; // silence before the first word; a hard start feels clipped

const round = (n) => Math.round(n * 1000) / 1000;

export function probeDuration(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], {
    encoding: 'utf8',
  });
  return Number.parseFloat(out.trim());
}

/**
 * One WAV per sentence, from the local Kokoro voice. A sentence is only
 * re-voiced when its words, the voice or the speed changed — each run of the
 * model costs seconds, and an unchanged line should sound identical anyway.
 * The text goes in through a .txt file: passing it on a Windows command line
 * breaks on the first apostrophe.
 */
export function voice(dir, script) {
  const audio = path.join(dir, 'audio');
  mkdirSync(audio, { recursive: true });
  const env = { ...process.env };
  if (!env.HYPERFRAMES_PYTHON && existsSync(PYTHON)) env.HYPERFRAMES_PYTHON = PYTHON;
  let made = 0;
  for (const s of script.sentences) {
    const wav = path.join(audio, `${s.id}.wav`);
    const stamp = path.join(audio, `${s.id}.json`);
    const want = JSON.stringify({ say: s.say, voice: script.voice, speed: script.speed });
    if (existsSync(wav) && existsSync(stamp) && readFileSync(stamp, 'utf8') === want) continue;
    const txt = path.join(audio, `${s.id}.txt`);
    writeFileSync(txt, s.say);
    execFileSync(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['-y', HYPERFRAMES, 'tts', txt, '--voice', script.voice, '--speed', String(script.speed), '--output', wav],
      { cwd: dir, env, stdio: ['ignore', 'ignore', 'inherit'], shell: process.platform === 'win32' },
    );
    writeFileSync(stamp, want);
    made++;
  }
  return made;
}

/**
 * Join the sentences with their pauses and record exactly when each one is
 * spoken. Because each sentence is its own file, its start and end are KNOWN —
 * the captions sync to these numbers, no speech recognition involved.
 *
 * Loudness-normalised to -14 LUFS, the level TikTok, Reels and Shorts play at:
 * a quiet clip in a loud feed reads as broken and gets swiped. loudnorm
 * changes level only — the pauses, and so every timing, are untouched.
 */
export function narration(dir, script) {
  const first = path.join(dir, 'audio', `${script.sentences[0].id}.wav`);
  const rate = execFileSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=sample_rate', '-of', 'default=nw=1:nk=1', first],
    { encoding: 'utf8' },
  ).trim();

  const inputs = [];
  const filters = [];
  const sentences = [];
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
    const file = path.join(dir, 'audio', `${s.id}.wav`);
    const d = probeDuration(file);
    inputs.push('-i', file);
    filters.push(`[${n}:a]`);
    n++;
    sentences.push({ id: s.id, show: s.show, start: round(cursor), end: round(cursor + d) });
    cursor += d;
    silence(s.pauseAfter ?? 0.3);
  }

  execFileSync(
    'ffmpeg',
    [
      '-y', '-v', 'error', ...inputs,
      '-filter_complex', `${filters.join('')}concat=n=${n}:v=0:a=1,loudnorm=I=-14:TP=-1.5:LRA=11[out]`,
      '-map', '[out]', '-ar', '48000', path.join(dir, 'narration.wav'),
    ],
    { stdio: 'inherit' },
  );
  const timings = { total: round(cursor), sentences };
  writeFileSync(path.join(dir, 'timings.json'), JSON.stringify(timings, null, 2));
  return timings;
}

export const videoLength = (script, timings) => round(timings.sentences[timings.sentences.length - 1].end + (script.tail ?? 0.9));

/**
 * The music bed, ducked whenever the voice speaks. The user asked for music
 * that is "not loud, easy on the ear": the bed is set to a LOUDNESS, not a
 * gain (recordings differ by 20 dB and more — a fixed -17 dB measured -51 LUFS
 * on a quiet piano, which is silence), -31 LUFS by default, 17 dB under the
 * voice; a sidechain compressor keyed on the voice pushes it lower under
 * speech and lets it swell back in the pauses.
 *
 * LICENCE RULE: public domain or CC0 only, composition AND recording — an
 * unlicensed track gets a short muted or claimed. See ../music/LIBRARY.md.
 */
export function mix(dir, script, timings, musicFile) {
  if (!existsSync(musicFile)) throw new Error(`music file not found: ${musicFile}`);
  const total = videoLength(script, timings);
  const start = script.music?.start ?? 0;
  const level = script.music?.levelLufs ?? -31;
  const fadeOut = 2.5;
  const filter = [
    `[1:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=${level}:TP=-6:LRA=11,` +
      `afade=t=in:st=0:d=1.5,afade=t=out:st=${(total - fadeOut).toFixed(3)}:d=${fadeOut}[bed]`,
    `[0:a]aresample=48000,aformat=channel_layouts=stereo,apad=whole_dur=${total},asplit=2[voice][key]`,
    // Fast attack so the first syllable is clear, slow release so the music
    // swells back gently rather than pumping.
    `[bed][key]sidechaincompress=threshold=0.015:ratio=8:attack=12:release=450[ducked]`,
    `[voice][ducked]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[out]`,
  ].join(';');
  execFileSync(
    'ffmpeg',
    [
      '-y', '-v', 'error',
      '-i', path.join(dir, 'narration.wav'),
      '-ss', String(start), '-t', String(total), '-i', musicFile,
      '-filter_complex', filter, '-map', '[out]', '-ar', '48000', '-t', String(total),
      path.join(dir, 'mix.wav'),
    ],
    { stdio: 'inherit' },
  );
  return { total, level, start };
}
