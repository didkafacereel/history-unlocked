/**
 * Writes script.json for the Pegasus Bridge long video (16:9, make-wide.mjs).
 *   node video/old-history/pegasus/build-script.mjs
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
// archive film: general D-Day footage (not of this bridge) — labelled for what it shows
const GLORY = '“The True Glory” (1945)';
const OWI = 'D-Day 1944 · US Office of War Information';
const FG = (n, what, o = {}) => F(`${n}.mp4`, `${what} · ${GLORY}`, o);
const FO = (n, what, o = {}) => F(`${n}.mp4`, `${what} · ${OWI}`, o);
const AAF = '“Normandy: The Airborne Invasion of Fortress Europe” · US Army Air Forces';
const FA = (n, what, o = {}) => F(`${n}.mp4`, `${what} — Allied gliders, not this mission · ${AAF}`, o);

// ═══ THE STORY ═════════════════════════════════════════════════════════════
// 0 — the hook
S('s1', 'Just after midnight on the sixth of June, nineteen forty-four, a glider with no engine crashed into a field in Normandy.', 'Just after midnight on 6 June 1944, a glider with no engine crashed into a field in Normandy.',
  [FA('f-gliders', 'Gliders in flight, 1944'), P('gliders-canal', { move: 'in', credit: 'Three of the gliders beside the canal bridge, June 1944 · IWM' })], 0.4);
S('s2', 'Its nose stopped in the German barbed wire, a few dozen meters from the bridge it had come to take.', null,
  [P('glider-b5232', { move: 'right', fact: 'One of the gliders at the canal bridge, 8 June 1944' })], 0.4);
S('s3', 'Ten minutes later, both bridges were in British hands. This is the story of Pegasus Bridge.', null,
  [ST('Ten minutes. *Two bridges.*', { image: 'bridge-1944', kicker: 'Pegasus Bridge · 6 June 1944' })], 0.6);

// 1 — why the bridges mattered
S('s4', 'Two bridges, five hundred meters apart. One over the Caen Canal, one over the river Orne.', 'Two bridges, 500 meters apart. One over the Caen Canal, one over the river Orne.',
  [P('bridge-july', { fact: 'The canal bridge at Bénouville, July 1944' }), P('orne-bridge', { fact: 'The river Orne bridge, 1944', move: 'in' })]);
S('s5', 'They were the only way east from Sword Beach, where British troops would land at dawn.', null,
  [P('sword-landing', { move: 'in', fact: 'Sword Beach, 6 June 1944' })]);
S('s6', 'If the Germans blew them up, the British paratroopers on the far side would be cut off. If the Germans kept them, their tanks could drive straight to the beaches.', null,
  [P('gale-troops', { fact: 'Major-General Richard Gale and men of the 6th Airborne Division', move: 'in' }), P('panzer-iv', { fact: 'A German Panzer IV, Normandy 1944', move: 'right' })]);
S('s7', 'Intelligence said the bridges were guarded, and wired for demolition. There would be no time for a long fight.', null,
  [P('atlantic-wall', { move: 'in', fact: 'Atlantic Wall gun battery, Normandy', credit: 'Longues-sur-Mer · CC0' }), ST('No time for a *long fight*.', { image: 'caen-sign', kicker: 'The problem' })]);
S('s8', 'So the plan was simple, and insane. Land right on top of them. In the dark. In gliders.', null,
  [P('horsa-flight', { fact: 'An Airspeed Horsa glider', move: 'left' }), FA('f-tow', 'Gliders under tow')], 0.5);

// 2 — the men
S('s9', 'The job went to Major John Howard, a former policeman, and D Company of the Oxfordshire and Buckinghamshire Light Infantry.', null,
  [P('glider-troops', { move: 'in', fact: 'Glider troops in Normandy, June 1944' })]);
S('s10', 'For weeks at a time they trained at night. They got up at eight in the evening and went to bed at one in the afternoon.', 'For weeks at a time they trained at night. They got up at 8 in the evening and went to bed at 1 in the afternoon.',
  [P('horsa-troops', { fact: 'Airborne troops leaving a Horsa glider in training', move: 'right' })]);
S('s11', 'They practised on two bridges in England that looked just like the real ones.', null,
  [P('glider-inside', { move: 'in', fact: 'Airborne troops inside a Horsa glider' })]);
LONG('s12', { type: 'number', image: 'pilots-briefing', label: 'men in the assault', value: 181, count: { from: 's12@0.2', to: 's12@0.7' }, sub: '139 infantry · 30 engineers · 12 glider pilots' });
S('s12', 'One hundred eighty-one men, in six wooden gliders.', '181 men, in six wooden gliders.', [], 0.3);
S('s13', 'The lead pilot, Staff Sergeant Jim Wallwork, warned that the gliders were too heavy. Howard left men behind to make them lighter.', null,
  [P('glider-pilots', { fact: 'Glider pilots before D-Day', move: 'up' })]);
S('s14', 'The code words for success were Ham, for the canal bridge, and Jam, for the river bridge.', null,
  [ST('*HAM* · canal bridge  —  *JAM* · river bridge', { image: 'halifax-crew', kicker: 'The code words' })], 0.5);

// 3 — the flight
S('s15', 'At four minutes to eleven on the fifth of June, Halifax bombers towed the gliders into the air from the south of England.', 'At 10:56 PM on 5 June, Halifax bombers towed the gliders into the air from the south of England.',
  [P('halifax-horsa', { fact: 'A Halifax tows a Horsa glider into the air', move: 'right' }), P('halifax', { move: 'right', fact: 'A Handley Page Halifax bomber' })]);
S('s16', 'Over the French coast, the ropes were cut. The pilots flew on in silence, by compass and stopwatch.', null,
  [FA('f-cockpit', 'Glider pilots at the controls'), P('tow', { move: 'left', fact: 'Gliders under tow' })]);
S('s17', 'At sixteen minutes past midnight, Wallwork’s glider hit the ground, bounced across the field, and smashed into the barbed wire.', 'At 00:16, Wallwork’s glider hit the ground, bounced across the field, and smashed into the barbed wire.',
  [P('gliders-crash', { move: 'in', fact: 'Crash-landed gliders by the canal bridge' })], 0.3);
S('s18', 'Both pilots were thrown through the cockpit glass. They were stunned, but alive.', null,
  [FA('f-crash', 'A glider after a crash landing'), P('gliders-b7035', { move: 'right', fact: 'The gliders near the bridge, June 1944' })], 0.3);
S('s19', 'Two more gliders landed a minute apart. One broke in half beside a pond. Lance Corporal Fred Greenhalgh was thrown into the water, and drowned.', null,
  [P('glider-wall', { move: 'in', fact: 'A Horsa glider wrecked on landing, Normandy' })], 0.5);

// 4 — the assault (map)
S('s20', 'On the bridge, two German sentries heard the noise. One ran, shouting “paratroops.” The other fired a flare.', null, [], 0.3);
S('s21', 'Lieutenant Den Brotheridge led the first platoon across the bridge at a run.', null, [], 0.3);
S('s22', 'A machine gun opened fire. Brotheridge threw a grenade, and was hit in the neck.', null, [], 0.3);
S('s23', 'His men cleared the trenches and the pillbox with grenades and Sten guns. By twenty-one minutes past midnight, the canal bridge was theirs.', 'His men cleared the trenches and the pillbox with grenades and Sten guns. By 00:21, the canal bridge was theirs.', [], 0.3);
S('s24', 'At the river bridge, one glider landed three hundred meters away. A single mortar round knocked out the machine gun, and the platoon walked across.', 'At the river bridge, one glider landed 300 meters away. A single mortar round knocked out the machine gun, and the platoon walked across.', [], 0.3);
S('s25', 'Another glider was missing. It had landed by the wrong river, thirteen kilometers away.', 'Another glider was missing. It had landed by the wrong river, 13 kilometers away.', [], 0.3);
S('s26', 'The engineers searched for the explosives. The bridges were ready to be blown, but the charges had never been put in place.', null, [], 0.4);
S('s27', 'Howard’s radio operator sent the signal: Ham and Jam. Both bridges taken, intact.', null, [], 0.7);

// 5 — the cost of the first minutes
S('s28', 'Den Brotheridge died of his wounds. He is often called the first Allied soldier killed by enemy fire on D-Day.', null,
  [P('brotheridge-grave', { move: 'up', fact: 'The grave of Lt Den Brotheridge, Ranville', credit: 'Ranville churchyard · public domain' })], 0.5);
S('s29', 'His wife was eight months pregnant. His daughter was born two weeks later.', 'His wife was 8 months pregnant. His daughter was born two weeks later.',
  [ST('He never met his *daughter*.', { image: 'brotheridge-grave', kicker: 'Lt Den Brotheridge, 1915–1944' })], 0.7);

// 6 — holding on (map)
S('s30', 'Now they had to hold. Howard blew the letter V in Morse code on his whistle, to guide the paratroopers landing in the dark.', null,
  [FA('f-paras', 'Paratroopers drop'), P('gliders-aerial', { fact: 'Gliders and parachutes on the landing zone', move: 'in' })]);
S('s31', 'The German commander of the bridges drove onto them in a half-track to see what was happening. He was taken prisoner.', null, [], 0.3);
S('s32', 'Around two in the morning, German tanks came down the road toward the bridge.', 'Around 2 AM, German tanks came down the road toward the bridge.', [], 0.3);
S('s33', 'D Company had one working anti-tank weapon, a PIAT. Its first round hit the leading tank. The tank exploded, and the rest pulled back.', null, [], 0.5);
S('s34', 'The big Panzer divisions could not move without Hitler’s order. Hitler was asleep, and his staff would not wake him.', 'The big Panzer divisions could not move without Hitler’s order. Hitler was asleep, and his staff would not wake him.',
  [P('panzer-iv', { move: 'in' }), P('atlantic-wall', { move: 'right', fact: 'German coastal defences, Normandy' })]);
S('s35', 'At dawn came snipers. At nine, two German gunboats. At ten, a single plane dropped a bomb, which hit the bridge, and did not explode.', 'At dawn came snipers. At 9, two German gunboats. At 10, a single plane dropped a bomb, which hit the bridge, and did not explode.',
  [P('benouville-1944', { move: 'in', fact: 'Bénouville, June 1944' }), P('bridge-1944', { move: 'left' })]);

// 7 — the pipes
S('s36', 'Then, at half past one in the afternoon, the men on the bridge heard bagpipes.', 'Then, at 1:30 PM, the men on the bridge heard bagpipes.',
  [P('millin', { move: 'in', fact: 'Piper Bill Millin, 1944' })], 0.4);
S('s37', 'It was Bill Millin, the piper of Lord Lovat’s commandos, marching up from Sword Beach. The relief had arrived.', null,
  [P('lovat-dieppe', { move: 'in', fact: 'Lord Lovat, 1942' }), FG('f-commandos', 'British commandos before the invasion'), P('commandos-march', { move: 'right', fact: 'Commandos move inland from Sword, 6 June 1944' })]);
S('s38', 'Legend says Lovat apologised for being a few minutes late. By the plan, they were well over an hour late.', null,
  [ST('“Sorry we’re *late*.”', { image: 'carrier-bridge', kicker: 'The legend — the real delay was longer' })], 0.5);

// 8 — afterwards
S('s39', 'Of the one hundred eighty-one men who landed, two were killed and fourteen wounded.', 'Of the 181 men who landed, two were killed and 14 wounded.',
  [P('commandos-b5058', { move: 'in', fact: 'British troops, D-Day' })]);
S('s40', 'Air Chief Marshal Leigh-Mallory called the landings among the most outstanding flying achievements of the war.', null,
  [Q('One of the most outstanding flying achievements of the war.', 'Air Chief Marshal Trafford Leigh-Mallory', { image: 'leigh-mallory' })]);
S('s41', 'Howard received the Distinguished Service Order from Montgomery himself. Eight of the glider pilots got the Distinguished Flying Medal.', null,
  [P('montgomery-gale', { fact: 'Montgomery with Gale and Poett, Normandy 1944', move: 'in' })]);
S('s42', 'The canal bridge was renamed Pegasus Bridge, after the winged horse on the badge of the British airborne troops.', null,
  [P('bridge-today', { move: 'in', fact: 'The original bridge, now at the Pegasus Memorial museum', credit: 'Bénouville · public domain' }), P('cafe-gondree', { move: 'up', fact: 'Café Gondrée, beside the bridge, today', credit: 'CC0' })]);
S('s43', 'Every sixth of June until he died, John Howard came back to lay a wreath where the gliders had landed.', 'Every 6 June until he died, John Howard came back to lay a wreath where the gliders had landed.',
  [P('gliders-canal', { move: 'in' })]);
S('s44', 'So, was Pegasus Bridge won by perfect planning, or by perfect luck? Tell us what you think.', null,
  [ST('Perfect *planning*… or perfect *luck*?', { image: 'gliders-b5202', kicker: 'You decide' })], 0.4);

// ═══ THE MAP ═══════════════════════════════════════════════════════════════
// north is up; the canal (west) and the Orne (east) run north–south; the road crosses both
const BLUE = '#2fb4e0';
const maps = {
  bridges: {
    schematic: 'schematic — positions approximate',
    shift: [0, 40],
    zoom: [1.06, 1.12],
    legend: [{ color: BLUE, text: 'British' }, { color: '#8d98a5', text: 'German' }, { color: '#e8dfc8', text: 'Horsa glider' }],
    terrain: {
      rivers: [
        { points: [[700, 60], [700, 300], [700, 560], [700, 800]], width: 34 },
        { points: [[1290, 60], [1270, 250], [1310, 420], [1260, 600], [1290, 800]], width: 46 },
      ],
      areas: [
        { points: [[300, 452], [1700, 452], [1700, 478], [300, 478]], fill: 'rgba(210,200,170,0.22)', stroke: 'rgba(210,200,170,0.35)' },
        { points: [[850, 560], [960, 560], [960, 640], [850, 640]], fill: 'rgba(79,209,255,0.14)', stroke: 'rgba(79,209,255,0.4)', dash: true },
      ],
      labels: [
        { x: 700, y: 430, text: 'CANAL BRIDGE', serif: false, size: 22, color: 'rgba(255,230,160,0.98)', anchor: 'middle' },
        { x: 1290, y: 430, text: 'RIVER BRIDGE', serif: false, size: 22, color: 'rgba(255,230,160,0.98)', anchor: 'middle' },
        { x: 640, y: 640, text: 'Caen Canal', size: 30, color: 'rgba(235,248,255,0.98)', rot: 90 },
        { x: 1370, y: 660, text: 'river Orne', size: 30, color: 'rgba(235,248,255,0.98)', rot: 90 },
        { x: 290, y: 560, text: 'BÉNOUVILLE', serif: false, size: 22, color: 'rgba(244,246,251,0.9)', anchor: 'middle' },
        { x: 1560, y: 560, text: 'RANVILLE', serif: false, size: 22, color: 'rgba(244,246,251,0.9)', anchor: 'middle' },
        { x: 905, y: 670, text: 'pond', size: 22, color: 'rgba(200,235,255,0.85)', anchor: 'middle' },
        { x: 1840, y: 190, text: 'N ↑', serif: false, size: 40, color: 'rgba(244,246,251,0.85)' },
      ],
    },
    units: [
      { id: 'gw', side: 'axis', color: '#8d98a5', x: 640, y: 400, w: 60, h: 40 },
      { id: 'ge', side: 'axis', color: '#8d98a5', x: 760, y: 520, w: 60, h: 40 },
      { id: 'gr', side: 'axis', color: '#8d98a5', x: 1350, y: 520, w: 60, h: 40 },
      { id: 'h1', side: 'glider', color: '#e8dfc8', x: 1100, y: 140, w: 74, h: 26, rot: -30 },
      { id: 'h2', side: 'glider', color: '#e8dfc8', x: 1160, y: 120, w: 74, h: 26, rot: -30 },
      { id: 'h3', side: 'glider', color: '#e8dfc8', x: 1220, y: 100, w: 74, h: 26, rot: -30 },
      { id: 'h6', side: 'glider', color: '#e8dfc8', x: 900, y: 120, w: 74, h: 26, rot: 30 },
      { id: 'p1', side: 'brit', color: BLUE, x: 790, y: 395, w: 64, h: 36 },
      { id: 'p6', side: 'brit', color: BLUE, x: 1080, y: 330, w: 64, h: 36 },
      { id: 'tk', side: 'axis', color: '#6f7a86', x: 300, y: 300, w: 70, h: 40 },
      { id: 'tk2', side: 'axis', color: '#6f7a86', x: 230, y: 250, w: 60, h: 34 },
      { id: 'piat', side: 'brit', color: BLUE, x: 560, y: 420, w: 50, h: 30 },
      { id: 'hq', side: 'brit', color: BLUE, x: 790, y: 500, w: 54, h: 30 },
    ],
  },
};
const mapA = {
  type: 'map', map: 'bridges', kicker: 'Bénouville · 00:16, 6 June 1944', note: 'battle',
  heads: [{ at: 's20', text: '++1++ · The gliders land' }, { at: 's21', text: '++2++ · Across the *canal bridge*' }, { at: 's24', text: '++3++ · The *river bridge*' }, { at: 's27', text: '*HAM* and *JAM*' }],
  steps: [
    { at: 's20@0.02', show: ['gw', 'ge', 'gr'], showDur: 0.6 },
    { at: 's20@0.05', show: ['h1', 'h2', 'h3'] },
    { at: 's20@0.08', dur: 1.6, move: { h1: { x: 790, y: 440, rot: -8 }, h2: { x: 860, y: 520, rot: -15 }, h3: { x: 900, y: 600, rot: 20 } }, arrows: [{ points: curve([1100, 140], [950, 220], [800, 430], 10), color: '#e8dfc8', width: 8, dur: 1.4, until: 's22' }] },
    { at: 's20@0.6', bursts: [{ x: 640, y: 380, color: GOLD, r: 50 }] },
    { at: 's21@0.05', show: ['p1'] },
    { at: 's21@0.3', dur: 1.8, move: { p1: { x: 620, y: 460 } }, arrows: [{ points: [[790, 420], [700, 462], [630, 462]], color: SKY, width: 14, dur: 1.4, until: 's24' }] },
    { at: 's22@0.4', bursts: [{ x: 640, y: 420, color: RED, r: 60 }] },
    { at: 's23@0.3', bursts: [{ x: 760, y: 520, color: GOLD }, { x: 640, y: 400, color: GOLD }], hide: ['gw', 'ge'], hideDur: 1.0 },
    { at: 's24@0.05', show: ['h6'] },
    { at: 's24@0.1', dur: 1.4, move: { h6: { x: 1090, y: 360, rot: 10 } }, arrows: [{ points: curve([900, 120], [1050, 180], [1090, 350], 8), color: '#e8dfc8', width: 8, dur: 1.2, until: 's26' }] },
    { at: 's24@0.4', show: ['p6'], bursts: [{ x: 1350, y: 520, color: GOLD, at: 's24@0.6' }] },
    { at: 's24@0.65', hide: ['gr'], dur: 1.6, move: { p6: { x: 1360, y: 470 } }, arrows: [{ points: [[1100, 400], [1250, 462], [1350, 465]], color: SKY, width: 14, dur: 1.3 }] },
    { at: 's27@0.15', bursts: [{ x: 700, y: 465, color: SKY, r: 80 }, { x: 1290, y: 465, color: SKY, r: 80, at: 's27@0.35' }] },
  ],
  tags: [
    { at: 's20@0.1', x: 560, y: 340, text: 'SENTRIES', color: '#cfd8e2', size: 24, anchor: 'end', to: [630, 390] },
    { at: 's21@0.5', x: 560, y: 560, text: 'BROTHERIDGE', color: '#9fe6ff', size: 24, anchor: 'end', to: [615, 475] },
    { at: 's25@0.2', x: 1700, y: 300, text: 'GLIDER 4: 13 KM AWAY', color: '#ffb0a8', size: 24, anchor: 'end' },
    { at: 's26@0.2', x: 905, y: 720, text: 'NO CHARGES FITTED', color: '#ffe08a', size: 26, anchor: 'middle' },
  ],
};
const mapB = {
  type: 'map', map: 'bridges', kicker: 'Holding the bridges · 6 June 1944', note: 'battle',
  heads: [{ at: 's31', text: 'A German *half-track* drives in' }, { at: 's32', text: '!!Tanks!! from Bénouville' }, { at: 's33', text: 'One *PIAT*. One shot.' }],
  steps: [
    { at: 's31@0.05', show: ['hq', 'p1'] },
    { at: 's31@0.15', show: ['tk2'], dur: 1.8, move: { tk2: { x: 600, y: 465 } }, arrows: [{ points: [[230, 465], [450, 465], [600, 465]], color: '#cfd8e2', width: 10, dur: 1.4, until: 's32' }] },
    { at: 's31@0.7', bursts: [{ x: 640, y: 465, color: GOLD }], hide: ['tk2'] },
    { at: 's32@0.05', show: ['tk', 'piat'] },
    { at: 's32@0.2', dur: 2.2, move: { tk: { x: 470, y: 400, rot: 30 } }, arrows: [{ points: curve([300, 300], [400, 330], [470, 400], 8), color: '#cfd8e2', width: 12, dur: 1.6 }] },
    { at: 's33@0.45', bursts: [{ x: 480, y: 405, color: GOLD, r: 90 }], arrows: [{ points: [[560, 420], [520, 412], [490, 405]], color: SKY, width: 10, dur: 0.5 }] },
    { at: 's33@0.7', hide: ['tk'], hideDur: 1.2 },
  ],
  tags: [
    { at: 's31@0.6', x: 520, y: 560, text: 'COMMANDER CAPTURED', color: '#ffe08a', size: 24, anchor: 'middle' },
    { at: 's33@0.5', x: 470, y: 330, text: 'PANZER IV', color: '#ffb0a8', size: 24, anchor: 'middle' },
  ],
};
scenes.push({ ...mapA, from: 's20', enter: 'cut' });
scenes.push({ ...mapB, from: 's31', enter: 'cut' });
const cueNum = (c) => {
  const m = /^s(\d+)(?:@([\d.]+))?$/.exec(c);
  return m ? Number(m[1]) + Number(m[2] ?? 0) : -1;
};
scenes.sort((a, b) => cueNum(a.from ?? 's0') - cueNum(b.from ?? 's0'));

const FB = `Just after midnight on D-Day, a glider with no engine crashed into the barbed wire beside a bridge in Normandy. Ten minutes later, the bridge was in British hands.

Major John Howard and 181 men flew in six wooden Horsa gliders, cut loose over the French coast and flown in silence by compass and stopwatch. Lieutenant Den Brotheridge led the charge across the canal bridge and was hit in the neck — he is often called the first Allied soldier killed by enemy fire on D-Day. His daughter was born two weeks later. Both bridges were taken intact: "Ham and Jam".

Then they held them — against a German tank, gunboats and a bomb that hit the bridge and didn't explode — until the bagpipes of Lord Lovat's commandos came up the road from Sword Beach.

▶ Watch the full video on YouTube: [PASTE YOUTUBE LINK HERE]

Perfect planning, or perfect luck? 👇

#History #DDay #PegasusBridge #WW2 #Normandy`;

const script = {
  format: 2, mode: 'wide', date: '2026-11-26', slug: 'pegasus',
  title: 'Pegasus Bridge — the ten minutes that opened D-Day',
  category: 'War', speed: 1.0,
  mapSource: 'Wikipedia on the capture of the Caen Canal and Orne bridges',
  imageCredit: 'Wikimedia Commons (public domain / CC0; many IWM Crown-copyright-expired photos)',
  sources: [
    'Wikipedia: Operation Deadstick (capture of the Caen Canal and Orne River bridges) — the bridges as the only exit east from Sword; 50 German guards; D Company 2nd Ox and Bucks under Major John Howard; night training; practice bridges near Exeter; 181 men (139 infantry, 30 engineers, 12 pilots) in six Horsa gliders; Wallwork’s overload warning; code words Ham and Jam; take-off at 22:56 from RAF Tarrant Rushton; release over the coast; first glider at 00:16; glider two broke near a pond and Lance-Corporal Fred Greenhalgh drowned; two sentries, the flare; Brotheridge wounded throwing a grenade; canal bridge cleared by 00:21; river bridge: glider six landed 300 m away, a mortar destroyed the MG 34; glider four landed at the Dives, about 13 km away; bridges prepared but explosives not attached; Major Schmidt captured in his half-track; the Panzer IV destroyed by the only working PIAT; Hitler asleep; gunboats at 09:00; the bomb at 10:00 that failed to explode; bagpipes at 13:30; casualties 2 killed, 14 wounded; Leigh-Mallory’s praise; Howard’s DSO from Montgomery; DFMs for eight pilots; renaming as Pegasus Bridge.',
    'Wikipedia: Den Brotheridge (often considered the first Allied soldier killed in action on D-Day; wife eight months pregnant; daughter born two weeks after his death); Jim Wallwork (pilots thrown through the cockpit); John Howard (former Oxford City policeman; returned every 6 June); Bill Millin (Lovat’s piper; commandos arrived a little past 1 PM against a noon schedule).',
    'Film: “The True Glory” (1945) and “Normandy: The Airborne Invasion of Fortress Europe” (US Army Air Forces) — general airborne and D-Day footage, mostly American gliders; not of this bridge. Map: schematic, positions approximate. Music: public domain.',
  ],
  music: { tracks: [{ id: 'mussorgsky-old-castle', start: 0, len: 100 }, { id: 'mountain-king', start: 0, len: 110 }, { id: 'mussorgsky-bydlo', start: 0, len: 100 }, { id: 'grieg-aase-death', start: 15, len: 150 }] },
  highlight: ['PEGASUS', 'HAM', 'JAM', 'D-DAY', 'BRIDGE', 'GLIDER', 'GLIDERS', 'BAGPIPES'],
  alert: ['CRASHED', 'DROWNED', 'KILLED', 'EXPLODED', 'TANKS', 'DIED'],
  names: ['HOWARD', 'WALLWORK', 'BROTHERIDGE', 'GREENHALGH', 'HITLER', 'MILLIN', 'LOVAT', 'MONTGOMERY', 'LEIGH-MALLORY'],
  chapters: [
    { at: 's1', title: 'A glider in the barbed wire' },
    { at: 's4', title: 'Why two bridges mattered' },
    { at: 's9', title: 'Howard’s men' },
    { at: 's15', title: 'The silent flight' },
    { at: 's20', title: 'Ten minutes: the assault' },
    { at: 's30', title: 'Holding the bridges' },
    { at: 's36', title: 'The bagpipes' },
    { at: 's39', title: 'Afterwards' },
  ],
  thumb: { image: 'gliders-canal', fx: 0.5, fy: 0.55, zoom: 1.1, lines: ['10 MINUTES', 'THAT OPENED', 'D-DAY'], hi: 0, tint: [47, 180, 224], kicker: 'PEGASUS BRIDGE 1944', side: 'left' },
  cta: { story: 'Ham and Jam.', say: 'Their signal was Ham and Jam. Yours is a single tap on subscribe.', pill: 'HAM AND JAM', note: 'a new story every week' },
  endImage: 'bridge-1944',
  maps, sentences, scenes,
  post: {
    facebook: FB,
    youtube: {
      title: 'The Glider That Crashed Into D-Day: How 181 Men Took Pegasus Bridge in 10 Minutes',
      description: 'Just after midnight on 6 June 1944, a glider with no engine crashed into the barbed wire beside a bridge in Normandy. Ten minutes later, both bridges were in British hands.\n\nThis animated explainer follows Major John Howard and 181 men of D Company, 2nd Ox and Bucks, as they fly six wooden Horsa gliders onto the Caen Canal and Orne river bridges — and then hold them against tanks, gunboats and a bomb that did not explode, until Lord Lovat\'s commandos arrive to the sound of Bill Millin\'s bagpipes. We also tell the story of Lieutenant Den Brotheridge, often called the first Allied soldier killed by enemy fire on D-Day.\n\nSubscribe for more battles, rulers and forgotten heroes.\n\nFilm: "The True Glory" (1945) and "Normandy: The Airborne Invasion of Fortress Europe" (US Army Air Forces) — general airborne footage, not of this mission. Images: public domain / CC0 via Wikimedia Commons (IWM). Map: schematic. Music: public domain. Sources: Wikipedia.\n\n#History #DDay #PegasusBridge #WW2 #Normandy\n\nKeywords: pegasus bridge, d-day, operation deadstick, john howard, horsa glider, normandy 1944, 6th airborne division, ww2 history, d-day explained, airborne assault, military history.',
      tags: ['pegasus bridge', 'd-day', 'd day', 'operation deadstick', 'pegasus bridge d-day', 'john howard', 'den brotheridge', 'jim wallwork', 'horsa glider', 'glider assault', 'normandy 1944', 'd-day 1944', '6th airborne division', 'ox and bucks', 'bill millin', 'lord lovat', 'sword beach', 'operation overlord', 'ww2', 'ww2 history', 'world war 2', 'd-day explained', 'airborne assault', 'military history', 'battle explained', 'history documentary', 'heroes of ww2', 'history'],
    },
    pinned: 'Was Pegasus Bridge won by perfect planning, or by perfect luck? Tell us what you think. 👇',
  },
};
writeFileSync(path.join(here, 'script.json'), JSON.stringify(script, null, 2) + '\n');
console.log(`script.json — ${sentences.length} sentences, ${scenes.length} scenes, ${sentences.reduce((n, s) => n + s.say.split(/\s+/).length, 0)} words`);
