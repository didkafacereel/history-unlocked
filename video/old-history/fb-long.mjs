// One-off: Facebook texts for the two long videos -> script.json post.facebook + POST.md (no re-render).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));

const FB = {
  cannae: `One afternoon in 216 BC, an army of about 50,000 trapped and destroyed a Roman army of about 86,000 — by Polybius, some 70,000 Romans died. Historians still call it the perfect battle.

Hannibal was outnumbered almost two to one. So he did something that looked like a mistake: he pushed the centre of his line forward and let it bend backwards. The Romans followed, packed tighter and tighter, until his cavalry closed behind them and his Libyan veterans turned in from both sides. Nobody could run, nobody could even swing a sword.

Ancient numbers are always uncertain — Polybius and Livy don't agree, and we say so in the video. But the idea has been copied for 2,000 years. This new video shows it on an animated map, with real archive pictures and film.

▶ Watch the full video on YouTube: [PASTE YOUTUBE LINK HERE]

Could you have spotted the trap? 👇

#History #Cannae #Hannibal #AncientRome #MilitaryHistory`,
  stalingrad: `In November 1942, in just four days, the Red Army surrounded about 300,000 Axis soldiers on the frozen steppe beside the Volga.

The trick was 2,000 years old: a pincer, the same idea Hannibal used at Cannae. The Germans held 90% of the ruined city, but their long flanks were guarded by weak Romanian armies. Two Soviet arrows met at Kalach — and the Sixth Army was inside the ring. The airlift needed 750 tons a day and delivered 105.

The numbers of dead are still debated, and we show where the sources disagree. New video: an animated map, real 1943 film and archive photos.

▶ Watch the full video on YouTube: [PASTE YOUTUBE LINK HERE]

Was Stalingrad won in the streets, or on the steppe? 👇

#History #Stalingrad #WW2 #EasternFront #MilitaryHistory`,
};

for (const [slug, text] of Object.entries(FB)) {
  const sp = path.join(here, slug, 'script.json');
  const s = JSON.parse(readFileSync(sp, 'utf8'));
  s.post.facebook = text;
  writeFileSync(sp, JSON.stringify(s, null, 2) + '\n');
  const bp = path.join(here, slug, 'build-script.mjs');
  let b = readFileSync(bp, 'utf8');
  if (!b.includes('facebook:')) {
    b = b.replace('  post: {\n    youtube: {', `  post: {\n    facebook: ${JSON.stringify(text)},\n    youtube: {`);
    writeFileSync(bp, b);
  }
  const pp = path.join(here, 'ready', slug, 'POST.md');
  let m = readFileSync(pp, 'utf8');
  if (!m.includes('## Facebook')) {
    m = m.replace('## YouTube', `## Facebook (The Old History page — post the video file or the YouTube link)\n\n${text}\n\n## YouTube`);
    writeFileSync(pp, m);
  }
  console.log(slug, 'ok', b.includes('facebook:'));
}
