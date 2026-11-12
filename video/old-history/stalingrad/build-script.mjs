/**
 * Writes script.json for the Cannae long video (16:9, make-wide.mjs).
 *   node video/old-history/cannae/build-script.mjs
 * The story is a list of sentences, each with 1–3 visuals that share the sentence's time evenly
 * (or by weight "w"). Map scenes span several sentences and are cued by sentence id.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const sentences = [];
const scenes = [];
let first = true;

// visual constructors ───────────────────────────────────────────────────────
const P = (image, o = {}) => ({ type: 'photo', image, ...o });
const F = (clip, credit, o = {}) => ({ type: 'film', clip, credit, ...o });
const ST = (main, o = {}) => ({ type: 'statement', main, ...o });
const Q = (quote, by, o = {}) => ({ type: 'quote', quote, by, ...o });

/** sentence(id, say, show, visuals, pause) — a sentence and the pictures shown while it is spoken. */
function S(id, say, show, visuals = [], pauseAfter = 0.4) {
  sentences.push({ id, say, show: show ?? say, pauseAfter });
  const total = visuals.reduce((n, v) => n + (v.w ?? 1), 0);
  let acc = 0;
  visuals.forEach((v, i) => {
    const frac = total ? acc / total : 0;
    acc += v.w ?? 1;
    const { w, ...rest } = v;
    const sc = { ...rest, from: i === 0 && first ? undefined : `${id}${frac > 0 ? `@${frac.toFixed(3)}` : ''}`, enter: 'cut' };
    if (first && i === 0) delete sc.from;
    first = false;
    scenes.push(sc);
  });
}
/** A scene that opens on a cue and runs until the next scene opens (maps, long timelines). */
function LONG(from, sc) {
  first = false;
  scenes.push({ ...sc, from, enter: 'cut' });
}

// geometry helpers ──────────────────────────────────────────────────────────
const curve = (p0, p1, p2, n = 14) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [Math.round((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]), Math.round((1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1])];
  });
const SKY = '#4fd1ff';
const RED = '#ff5a4d';
const GOLD = '#f5b73b';
// film clips from the 1943 Soviet documentary (filled in after scanning); label honestly
const DOC = 'Stalingrad · Soviet documentary, 1943';
const FL = (n, what, o = {}) => F(`${n}.mp4`, `${what} · ${DOC}`, o);

// ═══ THE STORY ═════════════════════════════════════════════════════════════
// 0 — the hook
S('s1', 'In November nineteen forty-two, in just four days, the Red Army surrounded about three hundred thousand Axis soldiers, on the frozen steppe beside the Volga.',
  'In November 1942, in just four days, the Red Army surrounded about 300,000 Axis soldiers, on the frozen steppe beside the Volga.',
  [FL('st-hook1', 'Soviet troops attack'), P('krichevsky', { move: 'up', credit: '“Liberation of Stalingrad” · Abram Krichevsky, 1943' }), FL('st-hook2', 'The Volga front')], 0.5);
S('s2', 'Many historians call it the greatest defeat in the history of the German Army.', null,
  [P('frontpage', { move: 'up', credit: 'Front page, 4 February 1943 · Belgian newspaper' }), P('german-pows', { fact: 'German prisoners, February 1943', move: 'in' })], 0.5);
S('s3', 'And it was built on a trick Hannibal made famous at Cannae: the pincer.', null,
  [ST('The *pincer*, 2,000 years later', { image: 'kalach-map', kicker: 'Operation Uranus' })], 0.5);

// 1 — how the Germans got there
S('s4', 'In the summer of nineteen forty-two, Germany launched a new offensive in the south of the Soviet Union. It was called Case Blue.', 'In the summer of 1942, Germany launched a new offensive in the south of the Soviet Union. It was called Case Blue.',
  [P('german-map', { fact: 'A German map of Stalingrad, 1942' }), FL('st-blue', 'German columns advance')]);
S('s5', 'Hitler split his forces. One half went for the oil of the Caucasus. The other, the Sixth Army, went for Stalingrad.', null,
  [P('paulus', { fact: 'Friedrich Paulus, commander of the Sixth Army', move: 'in' }), P('panzer-div', { fact: 'The 24th Panzer Division at Stalingrad, September 1942', move: 'in' }), P('manstein', { move: 'right', fact: 'German generals on the Eastern Front' })]);
S('s6', 'The city carried Stalin’s name. That alone made it a prize.', null,
  [ST('The city had *Stalin’s name*.', { image: 'stalingrad-1942', kicker: 'Why Stalingrad?' })]);
S('s7', 'For three months, the Germans fought for it, street by street, house by house.', null,
  [FL('st-ruins1', 'Fighting in the ruins'), P('germans-stalingrad', { fact: 'German troops in Stalingrad, 1942' }), P('ruined-city', { fact: 'Stalingrad in ruins' })]);
S('s8', 'The Soviet commander, Chuikov, ordered his men to hug the enemy, to stay so close that German planes and artillery could not hit them without hitting their own men.', null,
  [P('chuikov', { move: 'in', fact: 'Vasily Chuikov, commander of the 62nd Army', credit: 'Statue, Poznań' }), FL('st-street', 'Street fighting')]);
S('s9', 'Pavlov’s House, a four-story building, was held by a single platoon for weeks.', null,
  [P('pavlov-house', { fact: 'Pavlov’s House, 1943', move: 'in' }), P('marines-volga', { fact: 'Soviet troops on the Volga bank' })]);
S('s10', 'One division lost thirty percent of its men in the first twenty-four hours. Of ten thousand, only three hundred twenty were left at the end.', 'One division lost 30 percent of its men in the first 24 hours. Of 10,000, only 320 were left at the end.',
  [P('zaytsev-snipers', { move: 'right', fact: 'Red Army snipers, Stalingrad, December 1942' }), P('zaytsev-volga', { move: 'left', fact: 'Vasily Zaytsev, sniper' })]);
S('s11', 'By November, the Germans held ninety percent of the ruined city, and had pinned the defenders against the Volga.', 'By November, the Germans held 90 percent of the ruined city, and had pinned the defenders against the Volga.',
  [FL('st-volga', 'The Volga bank'), P('festung', { move: 'in', fact: 'German positions in Stalingrad, winter 1942' })]);
S('s12', 'But the Germans had a weakness. And the Soviets knew exactly where.', null, [ST('But they had a *weakness*.', { image: 'sept-front', kicker: 'November 1942' })], 0.5);

// 2 — the flanks
S('s13', 'The long flanks of the Sixth Army, north and south of the city, were guarded not by Germans, but by Romanian armies.', null, [P('romanians', { move: 'up', fact: 'Romanian troops, January 1942' })]);
S('s14', 'Poorly equipped. Old guns, horse-drawn artillery, and tanks whose small guns could not hurt a Soviet T-thirty-four.', 'Poorly equipped. Old guns, horse-drawn artillery, and tanks whose small guns could not hurt a Soviet T-34.',
  [P('t34-urano', { move: 'in', fact: 'A Soviet T-34 tank, 1942' }), FL('st-tanks', 'Soviet tanks')]);
S('s15', 'Hitler trusted them anyway.', null, [P('hitler', { move: 'in', fact: 'Hitler, June 1942' })], 0.5);
S('s16', 'Stalin’s generals saw the weakness, and built a plan on it. Operation Uranus.', null,
  [P('zhukov', { fact: 'Georgy Zhukov', move: 'in' }), P('vasilevsky', { fact: 'Aleksandr Vasilevsky, 1928', move: 'in' })], 0.5);

// 3 — the secret preparation
S('s17', 'They gathered about one point one million men, eight hundred tanks, and thirteen thousand guns.', 'They gathered about 1.1 million men, 800 tanks, and 13,000 guns.', [], 0.3);
S('s18', 'And they hid it. Radio silence. Camouflage. Orders carried by couriers instead of radio.', null,
  [ST('Radio *silence*. Couriers only.', { image: 'dead-wehrmacht', kicker: 'The deception' }), FL('st-night', 'Preparations')]);
S('s19', 'In three weeks, they ferried a hundred and eleven thousand soldiers, and hundreds of tanks, across the Volga.', 'In three weeks, they ferried 111,000 soldiers, and hundreds of tanks, across the Volga.',
  [FL('st-ferry', 'Crossing the Volga'), P('marines-volga', { move: 'left' })]);
S('s20', 'The Germans suspected an attack. But they did not know where, or when.', null,
  [P('german-map', { move: 'right', fact: 'A German map of the front' })], 0.5);
LONG('s17', { type: 'number', image: 'factory', label: 'Soviet soldiers for Operation Uranus', value: 1100000, suffix: '+', count: { from: 's17@0.25', to: 's17@0.85' }, sub: '804 tanks · 13,400 guns · over 1,000 aircraft' });

// 4 — the maps (21–28)
S('s21', 'On the nineteenth of November, in the fog, the northern pincer struck the Third Romanian Army.', 'On 19 November, in the fog, the northern pincer struck the Third Romanian Army.', [], 0.3);
S('s22', 'The Romanians held for a few hours, then collapsed. By the end of the day, twenty-seven thousand were prisoners.', 'The Romanians held for a few hours, then collapsed. By the end of the day, 27,000 were prisoners.', [], 0.3);
S('s23', 'The next day, the southern pincer broke through the Fourth Romanian Army.', null, [], 0.3);
S('s24', 'Two arrows, aimed at one place: the town of Kalach, on the river Don, behind the Sixth Army.', null, [], 0.3);
S('s25', 'On the twenty-third of November, Soviet tanks from the north met Soviet tanks from the south.', 'On 23 November, Soviet tanks from the north met Soviet tanks from the south.', [], 0.3);
S('s26', 'At first, they mistook each other for Germans, and traded fire.', null, [], 0.4);
S('s27', 'The ring was closed. Inside it, between two hundred fifty thousand and three hundred thirty thousand men. Estimates differ.', 'The ring was closed. Inside it, between 250,000 and 330,000 men. Estimates differ.', [], 0.7);
S('s28', 'The link-up had not been filmed. So the Soviets staged it again, for the newsreels.', null,
  [ST('The link-up was *staged* again for the cameras.', { image: 't34-urano', kicker: 'Re-enacted for the newsreel' })], 0.6);

// 5 — the cauldron
S('s29', 'Hitler refused to let the Sixth Army break out. It would be supplied from the air.', null,
  [P('paulus-pow', { fact: 'Paulus after his capture, 1943', move: 'in' }), FL('st-pocket', 'Inside the pocket')]);
S('s30', 'The airlift needed seven hundred fifty tons a day. It delivered a hundred and five.', 'The airlift needed 750 tons a day. It delivered 105.', [], 0.3);
LONG('s30', { type: 'compare', image: 'pocket-map', a: { name: 'Needed', value: 750, suffix: ' t/day', color: '#f5b73b', sub: 'to feed the Sixth Army', at: 's30@0.12' }, b: { name: 'Delivered', value: 105, suffix: ' t/day', color: '#ff6a5c', sub: 'by air, on average', at: 's30@0.55' } });
S('s31', 'Field Marshal Manstein tried to break in from the outside. He got within forty-eight kilometers. But the starving Sixth Army never broke out to meet him.', 'Field Marshal Manstein tried to break in from the outside. He got within 48 kilometers. But the starving Sixth Army never broke out to meet him.',
  [P('manstein', { move: 'in', fact: 'Erich von Manstein' }), FL('st-winter', 'Winter on the steppe')]);
S('s32', 'On the second of February, nineteen forty-three, the last pocket surrendered.', 'On 2 February, 1943, the last pocket surrendered.',
  [P('paulus-pow', { move: 'in' }), P('disfatta', { fact: 'After the defeat, February 1943' })], 0.4);
S('s33', 'About ninety-one thousand exhausted, starving men were taken prisoner, among them twenty-two generals.', 'About 91,000 exhausted, starving men were taken prisoner, among them 22 generals.',
  [FL('st-prisoners', 'German prisoners'), P('german-pows', { move: 'left' })]);
S('s34', 'Days earlier, Göring had compared the trapped army to the three hundred Spartans at Thermopylae. The soldiers did not appreciate it.', 'Days earlier, Göring had compared the trapped army to the 300 Spartans at Thermopylae. The soldiers did not appreciate it.',
  [ST('“Like the *Spartans* at Thermopylae.”', { image: 'festung', kicker: 'Göring, 30 January 1943' })], 0.5);

// 6 — the cost and the legacy
S('s35', 'The total cost is still debated. Axis casualties: from eight hundred thousand to one and a half million, depending on the source.', 'The total cost is still debated. Axis casualties: from 800,000 to 1.5 million, depending on the source.',
  [P('dead-wehrmacht', { move: 'in' }), ST('*800,000* to *1,500,000*', { image: 'disfatta', kicker: 'Axis casualties — sources differ' })]);
S('s36', 'Soviet casualties: more than one million, by official figures. Some historians say that is too low.', 'Soviet casualties: more than 1 million, by official figures. Some historians say that is too low.',
  [FL('st-memorial', 'The city after the battle'), P('ruined-city', { move: 'in' })]);
S('s37', 'More than a million soldiers and civilians may have died. It is one of the bloodiest battles in history.', null,
  [ST('Over *one million* dead', { image: 'marines-volga', kicker: 'Estimate — sources differ' })]);
S('s38', 'The myth of the invincible German army was gone. In the Soviet Union, they said: you cannot stop an army that has done Stalingrad.', null,
  [P('krichevsky', { move: 'up' }), FL('st-victory', 'Red Army troops celebrate')]);
S('s39', 'More than two thousand years after Cannae, the pincer had won again. Different armies. Same lesson. Guard only your front, and you will be hit on the flanks.', null,
  [ST('Guard only the front… and *lose the flanks*.', { image: 'kalach-map', kicker: 'The lesson of Cannae — and Stalingrad' })], 0.4);
S('s40', 'So, was Stalingrad won in the ruined streets, or on the open steppe, on the flanks? Tell us what you think.', null,
  [P('zaytsev-snipers', { move: 'in' }), ST('Won in the *streets*… or on the *steppe*?', { image: 'festung', kicker: 'You decide' })], 0.4);

// ═══ THE MAP ═══════════════════════════════════════════════════════════════
const ELL = (cx, cy, rx, ry, a0 = 0, a1 = 360, n = 36) => Array.from({ length: n + 1 }, (_, i) => { const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180; return [Math.round(cx + rx * Math.cos(a)), Math.round(cy + ry * Math.sin(a))]; });
const maps = {
  uranus: {
    schematic: 'schematic — positions approximate',
    shift: [0, 50],
    zoom: [1.1, 1.16],
    legend: [{ color: '#d9382e', text: 'Soviet forces' }, { color: '#8d98a5', text: 'German Sixth Army' }, { color: '#c9b458', text: 'Romanian armies' }],
    terrain: {
      land1: '#242c38', land2: '#10151e',
      rivers: [
        { points: [[1500, 100], [1535, 250], [1495, 420], [1535, 580], [1500, 700]], width: 40 },
        { points: [[330, 110], [430, 230], [560, 340], [680, 430], [760, 520], [770, 610], [700, 710]], width: 28 },
      ],
      areas: [{ points: [[1370, 320], [1465, 320], [1465, 580], [1370, 580]], fill: 'rgba(160,170,185,0.16)', stroke: 'rgba(200,210,225,0.5)', dash: true }],
      labels: [
        { x: 1418, y: 300, text: 'STALINGRAD', serif: false, size: 24, color: 'rgba(235,240,250,0.95)' },
        { x: 1590, y: 420, text: 'Volga', size: 38, color: 'rgba(235,248,255,0.98)', rot: 90 },
        { x: 400, y: 210, text: 'Don', size: 34, color: 'rgba(235,248,255,0.98)', rot: 45 },
        { x: 745, y: 538, text: 'KALACH', serif: false, size: 22, color: 'rgba(255,230,160,0.98)', anchor: 'middle' },
        { x: 1840, y: 190, text: 'N ↑', serif: false, size: 40, color: 'rgba(244,246,251,0.85)' },
      ],
    },
    units: [
      { id: 'g6', side: 'axis', color: '#8d98a5', x: 1130, y: 450, w: 380, h: 200 },
      { id: 'g6c', side: 'axis', color: '#7d8895', x: 1415, y: 450, w: 70, h: 120 },
      { id: 'r3', side: 'allyaxis', color: '#c9b458', x: 900, y: 235, w: 330, h: 70 },
      { id: 'r4', side: 'allyaxis', color: '#c9b458', x: 900, y: 650, w: 330, h: 70 },
      { id: 'sn1', side: 'rome', x: 500, y: 150, w: 150, h: 80 },
      { id: 'sn2', side: 'rome', x: 610, y: 120, w: 110, h: 70 },
      { id: 'ss1', side: 'rome', x: 1260, y: 700, w: 150, h: 70 },
      { id: 'ss2', side: 'rome', x: 1150, y: 720, w: 110, h: 60 },
      { id: 'sc', side: 'rome', x: 1478, y: 450, w: 32, h: 120 },
    ],
  },
};
const mapA = {
  type: 'map', map: 'uranus', kicker: 'Operation Uranus · November 1942',
  heads: [{ at: 's21', text: 'The Sixth Army’s !!weak flanks!!' }, { at: 's21@0.55', text: '++1++ · The northern pincer' }, { at: 's23', text: '++2++ · The southern pincer' }, { at: 's25', text: '++3++ · Kalach, *23 November*' }, { at: 's27@0.2', text: 'The ring is closed.' }],
  steps: [
    { at: 's21@0.02', show: ['g6', 'g6c', 'sc', 'r3', 'r4'], showDur: 0.8 },
    { at: 's21@0.35', show: ['sn1', 'sn2'] },
    { at: 's21@0.6', dur: 1.8, move: { sn1: { x: 770, y: 240 }, sn2: { x: 840, y: 215 } }, arrows: [{ points: [[500, 150], [640, 200], [775, 238]], color: RED, width: 14, dur: 1.5 }] },
    { at: 's22@0.1', bursts: [{ x: 790, y: 240, color: GOLD, r: 60 }], hide: ['r3'], hideDur: 1.2 },
    { at: 's22@0.5', dur: 1.8, move: { sn1: { x: 690, y: 425 }, sn2: { x: 740, y: 400 } }, arrows: [{ points: curve([775, 238], [640, 280], [690, 420], 10), color: RED, width: 14, dur: 1.6 }] },
    { at: 's23@0.05', show: ['ss1', 'ss2'] },
    { at: 's23@0.25', dur: 1.8, move: { ss1: { x: 930, y: 640 }, ss2: { x: 1020, y: 660 } }, arrows: [{ points: [[1260, 700], [1100, 665], [935, 640]], color: RED, width: 14, dur: 1.5 }] },
    { at: 's23@0.7', bursts: [{ x: 920, y: 650, color: GOLD, r: 60 }], hide: ['r4'], hideDur: 1.2 },
    { at: 's24@0.2', dur: 2.0, move: { ss1: { x: 740, y: 470 }, ss2: { x: 800, y: 490 } }, arrows: [{ points: curve([935, 640], [770, 640], [730, 470], 10), color: RED, width: 14, dur: 1.8 }] },
    { at: 's25@0.45', bursts: [{ x: 720, y: 445, color: GOLD, r: 80 }] },
    { at: 's27@0.1', arrows: [{ points: ELL(1130, 450, 430, 270, 90, 450, 40), color: RED, width: 16, dur: 3.2 }], dur: 1.0, move: { g6: { sx: 0.82, sy: 0.9 } } },
  ],
  tags: [
    { at: 's21@0.1', x: 900, y: 168, text: 'THIRD ROMANIAN ARMY', color: '#e6d27a', size: 26, anchor: 'middle', to: [900, 210] },
    { at: 's21@0.2', x: 1130, y: 330, text: 'GERMAN SIXTH ARMY', color: '#cfd8e2', size: 28, anchor: 'middle', to: [1130, 360] },
    { at: 's22@0.8', x: 650, y: 330, text: '27,000 PRISONERS', color: '#ffb0a8', size: 26, anchor: 'end' },
    { at: 's23@0.4', x: 900, y: 735, text: 'FOURTH ROMANIAN ARMY', color: '#e6d27a', size: 26, anchor: 'middle', to: [900, 690] },
    { at: 's27@0.4', x: 1130, y: 460, text: 'TRAPPED', color: '#ffffff', size: 48, anchor: 'middle' },
  ],
};
scenes.push({ ...mapA, from: 's21', enter: 'cut' });
const cueNum = (c) => {
  const m = /^s(\d+)(?:@([\d.]+))?$/.exec(c);
  return m ? Number(m[1]) + Number(m[2] ?? 0) : -1;
};
scenes.sort((a, b) => cueNum(a.from ?? 's0') - cueNum(b.from ?? 's0'));

const script = {
  format: 2, mode: 'wide', date: '2026-11-19', slug: 'stalingrad',
  title: 'Stalingrad — how the Red Army trapped 300,000 Germans in four days',
  category: 'War', speed: 1.0,
  mapSource: 'Wikipedia on Stalingrad and Operation Uranus',
  imageCredit: 'Wikimedia Commons (public domain)',
  sources: [
    'Wikipedia: Battle of Stalingrad and Operation Uranus — Case Blue (June 1942); the Sixth Army and the city that bore Stalin’s name; Chuikov’s “hugging” tactic; Pavlov’s House; the 13th Guards Rifle Division’s losses; the Romanian armies on the flanks and their obsolete equipment; Uranus: about 1.1 million Soviet personnel, 804 tanks, 13,400 guns, over 1,000 aircraft; deception (radio silence, couriers, camouflage); 111,000 soldiers ferried across the Volga in three weeks; 19 November 1942 attack on the Third Romanian Army (27,000 captured on day one); 20 November attack from the south; the link-up near Sovetsky on 23 November (tanks first mistook each other for Germans; the link-up was not filmed and was re-enacted for a newsreel); 250,000–330,000 Axis personnel trapped (estimates differ); the airlift (105 tons a day delivered, 750 needed); Manstein’s relief attempt (to within 48 km); surrender on 2 February 1943 (about 91,000 prisoners, 22 generals); Göring’s Thermopylae speech; casualty estimates range from 800,000 to 1.5 million Axis and over 1.1 million Soviet (disputed).',
    'Film: “Stalingrad / The City That Stopped Hitler: Heroic Stalingrad” (1943), Central Documentary Film Studio, public domain; used as the real footage of the period. Any re-enacted scene is labelled as such.',
    'Maps: schematic, built for this video; positions approximate. Music: Mussorgsky, Grieg and Chopin, public domain.',
  ],
  music: { tracks: [{ id: 'mussorgsky-bydlo', start: 0, len: 110 }, { id: 'chopin-marche-funebre', start: 0, len: 150 }, { id: 'mountain-king', start: 0, len: 110 }, { id: 'grieg-aase-death', start: 15, len: 150 }] },
  highlight: ['STALINGRAD', 'KALACH', 'PINCER', 'URANUS', 'VOLGA', 'FLANKS', 'CANNAE', 'TRAPPED'],
  alert: ['SURROUNDED', 'DEFEAT', 'COLLAPSED', 'DEAD', 'PRISONERS', 'STARVING', 'DIED'],
  names: ['HITLER', 'STALIN', 'PAULUS', 'MANSTEIN', 'CHUIKOV', 'GÖRING', 'HANNIBAL', 'ZHUKOV', 'ROMANIAN', 'ROMANIANS'],
  chapters: [
    { at: 's1', title: 'Four days in November 1942' },
    { at: 's4', title: 'How the Germans got to Stalingrad' },
    { at: 's13', title: 'The weak flanks' },
    { at: 's17', title: 'The secret preparation' },
    { at: 's21', title: 'The pincers close' },
    { at: 's29', title: 'The cauldron' },
    { at: 's35', title: 'The cost, and the legacy' },
  ],
  thumb: { image: 'krichevsky', mode: 'contain', lines: ['300,000', 'TRAPPED IN', '4 DAYS'], hi: 0, tint: [217, 56, 46], kicker: 'STALINGRAD 1942', side: 'left' },
  cta: { story: 'Cannae, again.', say: 'The Red Army closed a pincer. You can close one too, on the subscribe button.', pill: 'PINCER', note: 'a new story every week' },
  endImage: 'festung',
  maps, sentences, scenes,
  post: {
    facebook: "In November 1942, in just four days, the Red Army surrounded about 300,000 Axis soldiers on the frozen steppe beside the Volga.\n\nThe trick was 2,000 years old: a pincer, the same idea Hannibal used at Cannae. The Germans held 90% of the ruined city, but their long flanks were guarded by weak Romanian armies. Two Soviet arrows met at Kalach — and the Sixth Army was inside the ring. The airlift needed 750 tons a day and delivered 105.\n\nThe numbers of dead are still debated, and we show where the sources disagree. New video: an animated map, real 1943 film and archive photos.\n\n▶ Watch the full video on YouTube: [PASTE YOUTUBE LINK HERE]\n\nWas Stalingrad won in the streets, or on the steppe? 👇\n\n#History #Stalingrad #WW2 #EasternFront #MilitaryHistory",
    youtube: {
      title: 'Stalingrad: How the Red Army Trapped 300,000 Germans in Four Days',
      description: 'In November 1942, in just four days, the Red Army surrounded about 300,000 Axis soldiers on the frozen steppe beside the Volga. Many historians call it the greatest defeat in the history of the German Army — and it was built on a trick Hannibal made famous at Cannae: the pincer.\n\nThis animated explainer follows Operation Uranus on the map: the weak Romanian flanks of the German Sixth Army, the secret Soviet build-up, the northern and southern pincers meeting at Kalach, the airlift that could not feed 300,000 men, Manstein\'s failed relief attempt and the surrender on 2 February 1943. We also show the street fighting that led up to it — and we say plainly where the sources disagree (casualty figures range from 800,000 to 1.5 million for the Axis, and over a million for the Soviets).\n\nSubscribe for more battles, rulers and forgotten tactics.\n\nFilm: "Stalingrad / The City That Stopped Hitler" (1943, public domain). Images: public domain via Wikimedia Commons. Maps: schematic. Music: Mussorgsky, Chopin and Grieg, public domain. Sources: Wikipedia.\n\n#History #Stalingrad #WW2 #MilitaryHistory #OperationUranus\n\nKeywords: battle of stalingrad, stalingrad, operation uranus, stalingrad explained, ww2 battles, eastern front, sixth army, friedrich paulus, double envelopment, pincer movement, military history.',
      tags: ['battle of stalingrad', 'stalingrad', 'operation uranus', 'stalingrad explained', 'stalingrad 1942', 'stalingrad 1943', 'sixth army', 'friedrich paulus', 'chuikov', 'zhukov', 'manstein', 'eastern front', 'ww2', 'ww2 history', 'world war 2', 'ww2 battles', 'pincer movement', 'double envelopment', 'military history', 'military tactics', 'battle explained', 'history explained', 'history documentary', 'turning point of ww2', 'greatest battles in history', 'history'],
    },
    pinned: 'Was Stalingrad won in the ruined streets, or on the open steppe, on the flanks? Tell us what you think. 👇',
  },
};
writeFileSync(path.join(here, 'script.json'), JSON.stringify(script, null, 2) + '\n');
console.log(`script.json — ${sentences.length} sentences, ${scenes.length} scenes, ${sentences.reduce((n, s) => n + s.say.split(/\s+/).length, 0)} words`);
