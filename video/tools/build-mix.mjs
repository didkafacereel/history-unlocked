/**
 * Lay a music bed under the narration, ducked whenever the voice speaks.
 *
 *   node ../tools/build-mix.mjs      (run inside a day's project folder, after
 *                                     build-narration.mjs)
 *
 * Reads  script.json → "music": { file, start?, levelLufs? }, "tail"
 *        timings.json, narration.wav
 * Writes mix.wav — the one audio track the composition plays
 *
 * For the hand-built days; automated days run all of this through make.mjs.
 * The logic, and why the levels are what they are, lives in lib/audio.mjs.
 */
import { readFileSync } from 'node:fs';
import { mix } from './lib/audio.mjs';

const script = JSON.parse(readFileSync('script.json', 'utf8'));
const timings = JSON.parse(readFileSync('timings.json', 'utf8'));
if (!script.music?.file) throw new Error('script.json has no "music.file"');
const { total, level, start } = mix('.', script, timings, script.music.file);
console.log(`mix.wav ${total}s — ${script.music.file} from ${start}s at ${level} LUFS, ducked under the voice`);
