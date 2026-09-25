/**
 * Join per-sentence narration into one track and record exactly when each
 * sentence is spoken.
 *
 *   node ../tools/build-narration.mjs      (run inside a day's project folder)
 *
 * Reads  script.json + audio/<id>.wav
 * Writes narration.wav + timings.json
 *
 * For the hand-built days; automated days run all of this through make.mjs.
 * The logic lives in lib/audio.mjs.
 */
import { readFileSync } from 'node:fs';
import { narration } from './lib/audio.mjs';

const script = JSON.parse(readFileSync('script.json', 'utf8'));
const timings = narration('.', script);
console.log(`narration.wav ${timings.total}s`);
for (const t of timings.sentences) console.log(`  ${t.id} ${t.start.toFixed(2)} → ${t.end.toFixed(2)}`);
