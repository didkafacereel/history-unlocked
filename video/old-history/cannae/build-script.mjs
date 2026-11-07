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

// ═══ THE STORY ═════════════════════════════════════════════════════════════
// 0 — the hook
S('s1', 'In the summer of two hundred sixteen before Christ, in southern Italy, one army trapped an army far bigger than itself, and killed tens of thousands of men in a single afternoon.',
  'In the summer of 216 BC, in southern Italy, one army trapped an army far bigger than itself, and killed tens of thousands of men in a single afternoon.',
  [P('bust-capua', { kicker: 'Cannae, 216 BC', move: 'in' }), F('cab-alps-a.mp4', 'Hannibal crosses the Alps · "Cabiria", 1914 film — illustrative', { w: 1 }), P('paullus-death', { move: 'left', credit: 'The death of Paullus at Cannae · John Trumbull, 1773' })], 0.5);
S('s2', 'More than two thousand years later, generals still study how he did it.', 'More than 2,000 years later, generals still study how he did it.',
  [P('eisenhower', { fact: 'Dwight D. Eisenhower', move: 'in' }), P('schwarzkopf', { move: 'in' })], 0.5);
S('s3', 'This is the battle of Cannae. And it began with a problem Rome could not solve. His name was Hannibal.', null,
  [ST('The battle of *Cannae*', { image: 'ofanto-painting', kicker: 'The perfect battle' }), P('statue-louvre', { move: 'up', fact: 'Hannibal · statue by Sébastien Slodtz, 1704' })], 0.5);

// 1 — the problem: Hannibal in Italy
S('s4', 'Two years earlier, the Carthaginian general Hannibal had marched an army across the Alps, and straight into Italy.', null,
  [P('map-218', { fact: 'Rome and Carthage, 218 BC' }), F('cab-e1.mp4', 'Elephants in the Alps · "Cabiria", 1914 film — illustrative'), P('turner-alps', { move: 'in', credit: 'Hannibal crossing the Alps · J. M. W. Turner' })]);
S('s5', 'He crushed the Romans at the river Trebia. Then he crushed them again, at Lake Trasimene.', null,
  [P('map-trebia', { kicker: '218 BC · Trebia' }), F('cab-pass.mp4', 'Hannibal’s army · "Cabiria", 1914 film — illustrative'), P('flaminius', { fact: 'The Roman general Flaminius at Trasimene', move: 'in' }), P('trasimene', { kicker: '217 BC · Lake Trasimene', move: 'left' })]);
S('s6', 'Rome panicked, and gave command to a dictator, Fabius, who had a different plan. Do not fight Hannibal at all. Follow him. Starve him. Wear him down.', null,
  [P('fabius', { fact: 'Quintus Fabius Maximus', move: 'in' }), F('cab-army-a.mp4', 'An army on the march · "Cabiria", 1914 film — illustrative'), ST('Don’t fight. *Wear him down.*', { image: 'hollar-romans', kicker: 'The Fabian strategy' })]);
S('s7', 'It worked. But Romans hated it. Hannibal was plundering Italy in plain sight, and Rome’s allies were starting to wonder whether Rome could protect them.', null,
  [F('cab-horse.mp4', 'Hannibal’s column · "Cabiria", 1914 film — illustrative'), P('ofanto-painting', { move: 'right', fact: 'The Italian countryside' }), P('tavoliere', { move: 'right', credit: 'The Apulian plain' })]);
S('s8', 'So Rome decided to end it. Its next two consuls were told to find Hannibal, and destroy him.', null,
  [ST('Find him. *Destroy him.*', { image: 'cichorius-81', kicker: 'Rome, 216 BC' }), P('livy', { fact: 'Livy, who told the story of Cannae', move: 'in' })]);
S('s9', 'The Senate raised an army of a size Rome had never fielded before. Eight legions, plus allies. Ancient writers count about eighty thousand infantry, and six thousand cavalry.',
  'The Senate raised an army of a size Rome had never fielded before. Eight legions, plus allies. Ancient writers count about 80,000 infantry, and 6,000 cavalry.',
  [P('cichorius-81', { move: 'left', credit: 'Roman soldiers · Trajan’s Column, drawn by Conrad Cichorius' }), F('cab-legion.mp4', 'Roman soldiers · "Cabiria", 1914 film — illustrative'), P('standard-bearer', { fact: 'A Roman standard-bearer' })]);
S('s10', 'Hannibal had perhaps forty to fifty thousand. Spaniards, Gauls, Libyans, Numidian horsemen. A patchwork army, held together by loyalty to one man.', 'Hannibal had perhaps 40,000 to 50,000. Spaniards, Gauls, Libyans, Numidian horsemen. A patchwork army, held together by loyalty to one man.',
  [P('gaul-soldier', { fact: 'A Gaul' }), P('spanish-soldier', { fact: 'A Spaniard' }), P('numidian', { fact: 'A Numidian horseman' })], 0.3);
S('s11', 'The numbers for ancient battles are never exact. But everyone agrees on one thing: Rome had far more men.', null, []);
LONG('s11', { type: 'compare', image: 'coin', a: { name: 'Rome and allies', value: 86000, color: '#ff6a5c', sub: 'about 80,000 infantry + 6,000 cavalry', at: 's11@0.05' }, b: { name: 'Carthage', value: 50000, prefix: '≈ ', color: '#4fd1ff', sub: 'at most 40,000 foot + 10,000 horse (estimates)', at: 's11@0.45' } });

// 2 — the plan
S('s12', 'Hannibal knew that in a head-on fight, Roman heavy infantry was superior. So he would not fight head-on.', null,
  [P('cichorius-98', { move: 'right', credit: 'Roman legionaries · Trajan’s Column' }), P('gladius', { fact: 'A Roman gladius', move: 'in' })]);
S('s13', 'But he had something Rome did not: more cavalry, and better cavalry.', null,
  [P('numidian', { fact: 'Numidian light cavalry' }), F('cab-battle.mp4', 'A galloping horse · Eadweard Muybridge, 1887 — illustrative')]);
S('s14', 'So his plan was not to beat the Roman strength. It was to turn that strength against them.', null,
  [ST('Turn their *strength* into a *weakness*.', { image: 'bust-capua2', kicker: 'Hannibal’s plan' })]);

// 3 — the ground
S('s15', 'On the second of August, by the Roman calendar, the armies met on a flat plain at Cannae, beside the river Aufidus.', 'On 2 August, by the Roman calendar, the armies met on a flat plain at Cannae, beside the river Aufidus.',
  [P('ofanto-painting', { move: 'left', fact: 'The river Ofanto — the ancient Aufidus', credit: 'Giuseppe De Nittis, 1870' }), P('tavoliere', { move: 'left', credit: 'The Apulian plain' })]);
S('s16', 'The ground favored Hannibal. The river would guard one of his flanks. And the Romans would have to face the morning sun, with dust blowing into their eyes.', null,
  [P('tavoliere', { move: 'right', fact: 'The plain around Cannae' }), F('cab-column.mp4', 'Hannibal’s army on the march · "Cabiria", 1914 film — illustrative')]);
S('s17', 'One of Hannibal’s officers, Gisgo, looked at the huge Roman army and said it was astonishing. Hannibal replied: there is something more astonishing still. In all those thousands, there is not one man called Gisgo. And his army laughed.',
  'One of Hannibal’s officers, Gisgo, looked at the huge Roman army and said it was astonishing. Hannibal replied: there is something more astonishing still. In all those thousands, there is not one man called Gisgo. And his army laughed.',
  [P('bust-capua', { move: 'in', fact: 'Hannibal, according to Plutarch and Polybius’s tradition' }), P('oath-west', { fact: 'Hannibal swears eternal enmity to Rome · Benjamin West' })], 0.6);

// 4 — the deployment (map A)
S('s18', 'Here is how the two armies lined up.', null, [], 0.3);
S('s19', 'The Romans did something simple. They packed their infantry deep, into a tight mass, to punch straight through the middle.', null, [], 0.3);
S('s20', 'Cavalry guarded both flanks. The river was on their right.', null, [], 0.3);
S('s21', 'Hannibal did the opposite. In the center, his Spanish and Gallic infantry, pushed forward in a curve, toward the Romans.', null, [], 0.3);
S('s22', 'At the two ends, his best heavy infantry, the Libyans, held back, and waited.', null, [], 0.3);
S('s23', 'By the river, his heavy cavalry. On the other side, the Numidians, fast light horsemen.', null, [], 0.5);

// 5 — the battle (map B)
S('s24', 'The battle began with the cavalry. By the river, Hannibal’s Spanish and Gallic horsemen charged the Roman cavalry, and smashed it.', null, [], 0.3);
S('s25', 'But they did not chase the survivors. They rode around behind the entire Roman army, to the other side of the field.', null, [], 0.3);
S('s26', 'There, they hit the allied cavalry, and drove it from the field.', null, [], 0.4);
S('s27', 'In the center, the infantry collided. The Romans pushed forward hard, and Hannibal’s curve began to bend backward, step by step.', null, [], 0.3);
S('s28', 'It looked like his center was collapsing. The Romans poured in, packed tighter and tighter, until they could barely lift their swords.', null, [], 0.3);
S('s29', 'And they never noticed the Libyans, standing still on both sides of the trap.', null, [], 0.4);
S('s30', 'Then Hannibal gave the signal. The Libyans turned inward, and struck both flanks.', null, [], 0.3);
S('s31', 'And the cavalry came back, and closed the rear. One of the earliest pincer movements in recorded history.', null, [], 0.4);
S('s32', 'The Romans were now inside a pocket, with no way out.', null, [], 0.7);

// 6 — the slaughter
S('s33', 'What followed was a massacre. The Greek historian Polybius says seventy thousand Romans died. The Roman historian Livy says about forty-five thousand.',
  'What followed was a massacre. The Greek historian Polybius says 70,000 Romans died. The Roman historian Livy says about 45,000.',
  [P('paullus-death', { move: 'in', credit: 'Cannae · painting by John Trumbull' })], 0.3);
LONG('s33@0.3', { type: 'compare', image: 'paullus-death', a: { name: 'Polybius', value: 70000, color: '#ff6a5c', sub: 'Roman and allied infantry killed', at: 's33@0.32' }, b: { name: 'Livy', value: 45500, prefix: '≈ ', color: '#f5b73b', sub: 'infantry killed, plus 2,700 horse', at: 's33@0.7' } });
S('s34', 'Some modern historians think even the lower number is far too high. We simply do not know.', null,
  [P('polybius', { fact: 'Polybius, Greek historian', move: 'in' }), P('livy', { fact: 'Livy, Roman historian', move: 'in' }), ST('We simply *do not know*.', { image: 'paullus-death', kicker: 'Historians disagree' })], 0.4);
S('s35', 'What is certain is who died. The consul Paullus. Two-thirds of the senior officers. And about eighty men who were senators, or could have been.', null,
  [P('paullus-death', { move: 'in', credit: 'The death of Paullus at Cannae · John Trumbull, 1773' }), ST('*80* senators or ex-magistrates dead', { image: 'cichorius-98', kicker: 'According to Livy' })]);
S('s36', 'Hannibal lost perhaps six thousand to eight thousand men. The other consul, Varro, escaped with seventy horsemen.', 'Hannibal lost perhaps 6,000 to 8,000 men. The other consul, Varro, escaped with 70 horsemen.',
  [P('dying-gaul', { fact: 'A Gaul — most of Hannibal’s dead were Gauls', move: 'in' }), P('paullus-death', { move: 'left', credit: 'Cannae · painting by John Trumbull' })], 0.6);

// 7 — the aftermath
S('s37', 'In Rome, there was panic.', null, [Q('Never when the city was in safety was there so great a panic and confusion within the walls of Rome.', 'Livy', { image: 'cichorius-81' })], 0.4);
S('s38', 'A day of mourning was declared, because almost every family had lost someone.', null, [P('hollar-romans', { move: 'left', fact: 'Rome in mourning' })]);
S('s39', 'Most of southern Italy went over to Hannibal. Syracuse in Sicily. Even the king of Macedon.', null,
  [P('map-battles', { move: 'up', kicker: 'Rome’s allies defect' })]);
S('s40', 'His brother Mago carried the news home to Carthage, and poured a pile of gold rings, taken from the dead Romans, onto the floor of the Senate.', null,
  [P('hannibal-senate', { fact: 'Hannibal before the Senate of Carthage', move: 'in' }), P('coin', { fact: 'Carthaginian coin, 237–209 BC' })]);
S('s41', 'His cavalry commander, Maharbal, begged him to march on Rome. Hannibal refused. Maharbal answered: you know how to win a victory, Hannibal. You do not know how to use one.', null,
  [ST('“You know how to *win*. You don’t know how to *use* a victory.”', { image: 'bust-capua', kicker: 'Maharbal, according to Livy' })], 0.5);
S('s42', 'Historians still argue about it. Some say he was right: his army was in no state to besiege the biggest city in Italy.', null,
  [P('statue-louvre', { move: 'up' }), P('cichorius-81', { move: 'right' })], 0.5);
S('s43', 'And Rome refused to negotiate. It raised new legions, recruiting landless peasants, even slaves, and it banned the word peace.', null,
  [F('cab-legion2.mp4', 'Roman legionaries · "Cabiria", 1914 film — illustrative'), ST('Even the word “peace” was *banned*.', { image: 'hollar-romans', kicker: 'Rome’s answer' })]);
S('s44', 'A young officer named Scipio drew his sword on nobles who talked of running away, and made them swear to defend Rome.', null,
  [P('scipio-bronze', { fact: 'Scipio · bronze, Bode Museum', move: 'in' }), P('scipio-met', { move: 'in' })]);
S('s45', 'Fourteen years later, at Zama, that same Scipio, with a reformed army, ended the war.', null,
  [P('zama-motte', { move: 'left', fact: 'The battle of Zama, 202 BC' }), P('hannibal-scipio', { move: 'in', fact: 'Hannibal and Scipio' })]);

// 8 — the legacy
S('s46', 'But Cannae became a model. The perfect battle: the battle of annihilation, where you surround the enemy completely.', null,
  [ST('The *Cannae* model', { image: 'paullus-death', kicker: 'The legacy' }), P('cannae-map-horstmann', { fact: 'A modern map of the battle' })]);
S('s47', 'Around the year nineteen hundred, Germany’s chief of staff, Alfred von Schlieffen, wrote that a modern battle of annihilation could follow the same plan Hannibal had devised. His thinking shaped the German plan for the First World War.',
  'Around 1900, Germany’s chief of staff, Alfred von Schlieffen, wrote that a modern battle of annihilation could follow the same plan Hannibal had devised. His thinking shaped the German plan for the First World War.',
  [P('schlieffen', { move: 'in', fact: 'Alfred von Schlieffen' }), P('schlieffen-plan', { fact: 'The Schlieffen Plan' })]);
S('s48', 'Dwight Eisenhower wrote that every commander seeks a battle of annihilation, and tries to repeat, in modern war, the classic example of Cannae.', null,
  [P('eisenhower', { move: 'in', fact: 'Dwight D. Eisenhower' })]);
S('s49', 'In nineteen ninety-one, General Norman Schwarzkopf cited Cannae as an inspiration for the Gulf War.', 'In 1991, General Norman Schwarzkopf cited Cannae as an inspiration for the Gulf War.',
  [P('schwarzkopf', { move: 'in', fact: 'Gen. H. Norman Schwarzkopf' })]);
S('s50', 'An outnumbered general from Carthage taught the world how to win a war in a day. And still lost it.', 'An outnumbered general from Carthage taught the world how to win a battle in a day. And still lost the war.',
  [P('bust-capua', { move: 'in', fact: 'Hannibal Barca, 247–c. 183 BC' })], 0.6);
S('s51', 'So, was Cannae the perfect battle, or the most expensive victory in history? Tell us what you think.', null,
  [ST('Perfect battle… or *wasted victory*?', { image: 'ofanto-painting', kicker: 'You decide' })], 0.4);


// ═══ TIGHTENED NARRATION (the visuals above are unchanged) ═══════════════════
const TRIM = {
  s1: ['In two hundred sixteen before Christ, in southern Italy, one army trapped an army far bigger than itself, and killed tens of thousands of men in a single afternoon.', 'In 216 BC, in southern Italy, one army trapped an army far bigger than itself, and killed tens of thousands of men in a single afternoon.'],
  s2: ['More than two thousand years later, generals still study how.', 'More than 2,000 years later, generals still study how.'],
  s3: ['This is the battle of Cannae. It began with a problem Rome could not solve. His name was Hannibal.'],
  s4: ['Two years earlier, the Carthaginian general Hannibal had marched an army over the Alps and into Italy.'],
  s5: ['He crushed the Romans at the river Trebia. Then again, at Lake Trasimene.'],
  s6: ['Rome panicked, and gave command to a dictator, Fabius, with a new plan. Do not fight Hannibal. Follow him. Starve him. Wear him down.'],
  s7: ['It worked. But Romans hated it. Hannibal was plundering Italy, and Rome’s allies began to wonder if Rome could protect them.'],
  s8: ['So Rome decided to end it. Its next two consuls were told to find Hannibal, and destroy him.'],
  s9: ['The Senate raised an army of unprecedented size. Eight legions, plus allies. Ancient writers count about eighty thousand infantry, and six thousand cavalry.', 'The Senate raised an army of unprecedented size. Eight legions, plus allies. Ancient writers count about 80,000 infantry, and 6,000 cavalry.'],
  s10: ['Hannibal had perhaps forty to fifty thousand. Spaniards, Gauls, Libyans, Numidian horsemen, held together by loyalty to one man.', 'Hannibal had perhaps 40,000 to 50,000. Spaniards, Gauls, Libyans, Numidian horsemen, held together by loyalty to one man.'],
  s11: ['Ancient numbers are never exact. But everyone agrees: Rome had far more men.'],
  s12: ['Hannibal knew that head-on, Roman heavy infantry was superior. So he would not fight head-on.'],
  s13: ['But he had more cavalry, and better cavalry.'],
  s14: ['His plan was not to beat the Roman strength. It was to turn it against them.'],
  s15: ['On the second of August, by the Roman calendar, the armies met on a flat plain at Cannae, beside the river Aufidus.', 'On 2 August, by the Roman calendar, the armies met on a flat plain at Cannae, beside the river Aufidus.'],
  s16: ['The ground favored Hannibal. The river guarded one flank, and the Romans would face the morning sun, with dust in their eyes.'],
  s17: ['Before the battle, an officer named Gisgo called the Roman army astonishing. Hannibal reportedly replied: even more astonishing, in all those thousands, there is not one man called Gisgo.'],
  s18: ['Here is how the armies lined up.'],
  s19: ['The Romans packed their infantry deep, in a tight mass, to punch straight through the middle.'],
  s20: ['Cavalry guarded both flanks, and the river was on their right.'],
  s21: ['Hannibal did the opposite. In the center, his Spanish and Gallic infantry pushed forward, in a curve.'],
  s22: ['At the two ends, his best heavy infantry, the Libyans, held back, and waited.'],
  s23: ['By the river, his heavy cavalry. On the far side, the fast Numidians.'],
  s24: ['The battle began with the cavalry. By the river, Hannibal’s horsemen charged the Roman cavalry, and smashed it.'],
  s25: ['But they did not chase the survivors. They rode around behind the whole Roman army.'],
  s26: ['There, they hit the allied cavalry, and drove it from the field.'],
  s27: ['In the center, the infantry collided. The Romans pushed hard, and Hannibal’s curve bent backward, step by step.'],
  s28: ['It looked like his center was collapsing. The Romans poured in, packed tighter and tighter, until they could barely lift their swords.'],
  s29: ['And they never noticed the Libyans, standing at the sides of the trap.'],
  s30: ['Then Hannibal gave the signal. The Libyans turned inward, and struck both flanks.'],
  s31: ['The cavalry returned, and closed the rear. One of the earliest pincer movements in recorded history.'],
  s32: ['The Romans were inside a pocket, with no way out.'],
  s34: ['Some modern historians think even that is too high. We simply do not know.'],
  s35: ['What is certain is who died: the consul Paullus, most of the senior officers, and about eighty senators or former magistrates.'],
  s36: ['Hannibal lost perhaps six to eight thousand. The other consul, Varro, escaped with seventy horsemen.', 'Hannibal lost perhaps 6,000 to 8,000. The other consul, Varro, escaped with 70 horsemen.'],
  s38: ['Rome declared a day of mourning. Almost every family had lost someone.'],
  s39: ['Most of southern Italy went over to Hannibal, and the king of Macedon pledged his support.'],
  s40: ['His brother Mago poured a pile of gold rings, taken from dead Romans, onto the floor of the Senate in Carthage.'],
  s42: ['Historians still argue. Some say he was right: his army was in no state to besiege a city like Rome.'],
  s43: ['And Rome refused to negotiate. It raised new legions from landless peasants, even slaves, and banned the word peace.'],
  s44: ['A young officer named Scipio drew his sword on nobles who talked of fleeing, and made them swear to defend Rome.'],
  s45: ['Fourteen years later, at Zama, that same Scipio, with a reformed army, ended the war.'],
  s46: ['But Cannae became a model: the perfect battle of annihilation, where you surround the enemy completely.'],
  s47: ['Around the year nineteen hundred, Germany’s chief of staff, Alfred von Schlieffen, wrote that a modern battle of annihilation could follow Hannibal’s plan. It shaped the German plan for the First World War.', 'Around 1900, Germany’s chief of staff, Alfred von Schlieffen, wrote that a modern battle of annihilation could follow Hannibal’s plan. It shaped the German plan for the First World War.'],
  s48: ['Dwight Eisenhower wrote that every commander seeks a battle of annihilation, and tries to repeat Cannae.'],
  s49: ['In nineteen ninety-one, General Norman Schwarzkopf cited Cannae as an inspiration for the Gulf War.', 'In 1991, General Norman Schwarzkopf cited Cannae as an inspiration for the Gulf War.'],
  s50: ['An outnumbered general taught the world how to win a battle in a day. And still lost the war.'],
};
for (const [id, [say, show]] of Object.entries(TRIM)) {
  const s = sentences.find((x) => x.id === id);
  if (!s) throw new Error('TRIM: no sentence ' + id);
  s.say = say;
  s.show = show ?? say;
}

// ═══ THE MAPS ═══════════════════════════════════════════════════════════════
const maps = {
  cannae: {
    shift: [0, 50],
    zoom: [1.12, 1.18],
    legend: [{ color: '#d9382e', text: 'Rome and allies' }, { color: '#2fb4e0', text: 'Carthage' }, { color: '#bbbbbb', text: 'cavalry (striped)', cav: true }],
    terrain: {
      rivers: [{ points: [[-80, 734], [260, 716], [620, 730], [980, 708], [1340, 726], [1700, 702], [2000, 720]], width: 44 }],
      hills: [{ cx: 1600, cy: 300, rx: 230, ry: 160 }],
      areas: [
        { points: [[250, 470], [470, 470], [470, 620], [250, 620]], fill: 'rgba(217,56,46,0.10)', stroke: 'rgba(217,56,46,0.5)', dash: true },
        { points: [[1480, 500], [1740, 500], [1740, 650], [1480, 650]], fill: 'rgba(47,180,224,0.10)', stroke: 'rgba(47,180,224,0.5)', dash: true },
      ],
      labels: [
        { x: 360, y: 555, text: 'ROMAN CAMP', serif: false, size: 28, color: 'rgba(255,170,160,0.97)' },
        { x: 1610, y: 585, text: 'CARTHAGINIAN CAMP', serif: false, size: 24, color: 'rgba(150,225,250,0.97)' },
        { x: 1600, y: 300, text: 'Cannae', size: 50, color: 'rgba(244,246,251,0.92)' },
        { x: 960, y: 724, text: 'river Aufidus', size: 34, color: 'rgba(235,248,255,0.98)' },
        { x: 1840, y: 190, text: 'N ↑', serif: false, size: 40, color: 'rgba(244,246,251,0.85)' },
      ],
    },
    units: [
      { id: 'rc', side: 'rome', x: 800, y: 420, w: 210, h: 250 },
      { id: 'rcr', side: 'rome', kind: 'cav', label: '', x: 800, y: 640, w: 150, h: 84, color: '#c22f26' },
      { id: 'rcl', side: 'ally', kind: 'cav', label: '', x: 800, y: 205, w: 150, h: 84 },
      { id: 'cc1', side: 'carth', x: 1010, y: 335, w: 88, h: 100 },
      { id: 'cc2', side: 'carth', x: 985, y: 420, w: 88, h: 100 },
      { id: 'cc3', side: 'carth', x: 1010, y: 505, w: 88, h: 100 },
      { id: 'ln', side: 'libya', x: 1100, y: 262, w: 80, h: 130 },
      { id: 'ls', side: 'libya', x: 1100, y: 578, w: 80, h: 130 },
      { id: 'hc', side: 'carth', kind: 'cav', x: 1030, y: 645, w: 150, h: 86 },
      { id: 'nm', side: 'num', kind: 'cav', x: 1030, y: 200, w: 130, h: 76 },
    ],
  },
};

const mapA = {
  type: 'map', map: 'cannae', kicker: 'The two armies', note: 'deployment',
  heads: [{ at: 's18', text: 'Cannae, *2 August* 216 BC' }, { at: 's19@0.2', text: 'Rome: !!deep!! and tight' }, { at: 's21@0.1', text: 'Carthage: a ++curve++ bulging toward Rome' }],
  steps: [
    { at: 's18@0.15', show: ['rc', 'rcr', 'rcl'] },
    { at: 's21@0.15', show: ['cc1', 'cc2', 'cc3'] },
    { at: 's22@0.2', show: ['ln', 'ls'] },
    { at: 's23@0.15', show: ['hc', 'nm'] },
  ],
  tags: [
    { at: 's19@0.35', x: 690, y: 392, text: 'ROMAN INFANTRY\nPACKED DEEP', color: '#ff8c80', size: 30, anchor: 'end', to: [698, 430] },
    { at: 's20@0.1', x: 700, y: 650, text: 'ROMAN CAVALRY', color: '#ff8c80', size: 26, anchor: 'end', to: [724, 640] },
    { at: 's20@0.3', x: 700, y: 225, text: 'ALLIED CAVALRY', color: '#ffa89e', size: 26, anchor: 'end', to: [724, 205] },
    { at: 's21@0.55', x: 1290, y: 420, text: 'SPANISH + GAULS\n(with Hannibal)', color: '#7fdcff', size: 28, anchor: 'start', to: [1010, 420] },
    { at: 's22@0.5', x: 1290, y: 270, text: 'LIBYANS', color: '#7fdcff', size: 26, anchor: 'start', to: [1140, 262] },
    { at: 's22@0.7', x: 1290, y: 585, text: 'LIBYANS', color: '#7fdcff', size: 26, anchor: 'start', to: [1140, 578] },
    { at: 's23@0.3', x: 1290, y: 690, text: 'HEAVY CAVALRY', color: '#7fdcff', size: 26, anchor: 'start', to: [1105, 650] },
    { at: 's23@0.65', x: 1290, y: 200, text: 'NUMIDIANS', color: '#a8ecff', size: 26, anchor: 'start', to: [1096, 200] },
  ],
};

const mapB = {
  type: 'map', map: 'cannae', kicker: 'The trap closes', note: 'battle',
  heads: [
    { at: 's24', text: '++1++ · The cavalry fight' },
    { at: 's27', text: '++2++ · The center gives way' },
    { at: 's30', text: '++3++ · The pincer closes' },
    { at: 's32@0.3', text: 'Surrounded.' },
  ],
  steps: [
    // 1 — the cavalry by the river
    { at: 's24@0.1', dur: 1.6, move: { hc: { x: 850, y: 645 } }, arrows: [{ points: [[1030, 645], [930, 645], [875, 645]], color: SKY, width: 14, dur: 1.4 }] },
    { at: 's24@0.55', bursts: [{ x: 828, y: 645, color: GOLD }], hide: ['rcr'], hideDur: 1.0 },
    // 2 — round the back
    { at: 's25@0.05', dur: 1.3, move: { hc: { x: 640, y: 605 } }, arrows: [{ points: curve([850, 645], [520, 650], [560, 420], 12).concat(curve([560, 420], [560, 240], [790, 215], 8).slice(1)), color: SKY, width: 12, dur: 3.2, until: 's27' }] },
    { at: 's25@0.4', dur: 1.3, move: { hc: { x: 585, y: 420 } } },
    { at: 's25@0.75', dur: 1.3, move: { hc: { x: 650, y: 250 } } },
    { at: 's26@0.1', dur: 0.9, move: { hc: { x: 790, y: 212 } } },
    { at: 's26@0.2', bursts: [{ x: 790, y: 205, color: GOLD }], hide: ['rcl'], hideDur: 1.0 },
    // 3 — the centre: the Romans push, the curve bends back
    { at: 's27@0.1', dur: 2.0, move: { rc: { x: 900, y: 420, sx: 0.9 }, cc2: { x: 1010, y: 420 } }, arrows: [{ points: [[800, 420], [880, 420], [945, 420]], color: RED, width: 14, dur: 1.4, until: 's29' }] },
    { at: 's27@0.45', dur: 2.2, move: { cc1: { x: 1030, y: 350, rot: 18 }, cc3: { x: 1030, y: 490, rot: -18 }, cc2: { x: 1060, y: 420 } }, bursts: [{ x: 960, y: 420, color: RED }] },
    { at: 's28@0.2', dur: 3.2, move: { rc: { x: 960, y: 420, sx: 0.78, sy: 0.82 } }, bursts: [{ x: 1000, y: 420, color: RED, at: 's28@0.5' }] },
    // 4 — the Libyans turn in
    { at: 's30@0.15', dur: 1.6, move: { ln: { x: 965, y: 305, rot: 25 }, ls: { x: 965, y: 535, rot: -25 } }, arrows: [{ points: [[1100, 262], [1040, 290], [975, 330]], color: SKY, width: 14, dur: 1.3 }, { points: [[1100, 578], [1040, 550], [975, 510]], color: SKY, width: 14, dur: 1.3 }] },
    { at: 's30@0.6', bursts: [{ x: 940, y: 330, color: GOLD }, { x: 940, y: 510, color: GOLD }] },
    // 5 — the cavalry closes the rear
    { at: 's31@0.1', dur: 2.2, move: { hc: { x: 690, y: 420 }, nm: { x: 760, y: 320 } }, arrows: [{ points: curve([790, 212], [620, 260], [690, 420], 10), color: SKY, width: 14, dur: 1.8 }] },
    { at: 's31@0.7', bursts: [{ x: 700, y: 420, color: GOLD, r: 70 }] },
    { at: 's32@0.1', dur: 2.0, move: { rc: { x: 870, y: 420, sx: 0.55, sy: 0.6 } } },
  ],
  tags: [
    { at: 's24@0.5', x: 640, y: 545, text: 'ROMAN CAVALRY\nROUTED', color: '#ff8c80', size: 26, anchor: 'middle' },
    { at: 's27@0.8', x: 1230, y: 430, text: 'THE CURVE BENDS BACK', color: '#7fdcff', size: 30, anchor: 'start', to: [1070, 420], until: 's30' },
    { at: 's29@0.2', x: 1300, y: 640, text: 'THE LIBYANS WAIT', color: '#7fdcff', size: 28, anchor: 'start', to: [1140, 585], until: 's30@0.3' },
    { at: 's32@0.3', x: 960, y: 620, text: 'NO WAY OUT', color: '#ff8c80', size: 44, anchor: 'middle' },
  ],
};
// the map scenes open on the first sentence they illustrate, and run until the next scene opens
scenes.push({ ...mapA, from: 's18', enter: 'cut' });
scenes.push({ ...mapB, from: 's24', enter: 'cut' });
// the compare scenes were inserted in order above; sort all scenes by their opening cue
const cueNum = (c) => {
  const m = /^s(\d+)(?:@([\d.]+))?$/.exec(c);
  return m ? Number(m[1]) + Number(m[2] ?? 0) : -1;
};
scenes.sort((a, b) => cueNum(a.from ?? 's0') - cueNum(b.from ?? 's0'));
// scene-opening cues inside a map span (s19..s23, s25..s32) must not start new scenes: drop sentences' empty visuals — already empty.

const script = {
  format: 2,
  mode: 'wide',
  date: '2026-11-12',
  slug: 'cannae',
  title: 'Cannae — how Hannibal destroyed Rome’s biggest army in one afternoon',
  category: 'War',
  voice: undefined,
  speed: 1.0,
  mapSource: 'Polybius and Livy (as summarised on Wikipedia)',
  imageCredit: 'Wikimedia Commons, the Library of Congress, the Metropolitan Museum of Art (CC0), Conrad Cichorius, J. M. W. Turner, Henri Motte, Benjamin West and others',
  sources: [
    'Wikipedia: Battle of Cannae — Polybius and Livy on the army sizes, deployment, battle and casualties; Rome\'s eight legions; the Gisgo anecdote; Maharbal\'s exchange; Mago and the gold rings; Scipio at Canusium; Rome\'s refusal of peace and total mobilisation; the Cannae model and Schlieffen, Eisenhower and Schwarzkopf. Numbers for ancient armies and casualties are estimates and disputed.',
    'Film (public domain): Cabiria (1914) — an Italian silent epic with Hannibal crossing the Alps; used as illustrative footage and always labelled as fiction.',
    'Maps: schematic, built for this video from the accounts of Polybius and Livy; positions are approximate and modern historians disagree on details.',
    'Music: Mussorgsky (Old Castle, Bydlo) and Grieg (In the Hall of the Mountain King, Åse’s Death), public domain.',
  ],
  music: { tracks: [{ id: 'mussorgsky-old-castle', start: 0, len: 95 }, { id: 'mussorgsky-bydlo', start: 0, len: 110 }, { id: 'mountain-king', start: 0, len: 110 }, { id: 'grieg-aase-death', start: 15, len: 150 }] },
  highlight: ['CANNAE', 'ROME', 'HANNIBAL', 'CARTHAGE', 'CAVALRY', 'LIBYANS', 'PINCER', 'AUFIDUS', 'SCIPIO'],
  alert: ['MASSACRE', 'KILLED', 'DIED', 'DEAD', 'DESTROY', 'TRAPPED', 'PANIC', 'SURROUNDED', 'POCKET'],
  names: ['HANNIBAL', 'FABIUS', 'VARRO', 'PAULLUS', 'SCIPIO', 'MAHARBAL', 'GISGO', 'MAGO', 'POLYBIUS', 'LIVY', 'SCHLIEFFEN', 'EISENHOWER', 'SCHWARZKOPF', 'CARTHAGE', 'AUFIDUS'],
  chapters: [
    { at: 's1', title: 'A battle still studied today' },
    { at: 's4', title: 'Hannibal in Italy' },
    { at: 's12', title: 'The plan' },
    { at: 's18', title: 'How the armies lined up' },
    { at: 's24', title: 'The trap closes' },
    { at: 's33', title: 'The massacre' },
    { at: 's37', title: 'Rome after Cannae' },
    { at: 's46', title: 'The Cannae model' },
  ],
  thumb: { image: 'bust-capua', mode: 'contain', lines: ['HOW 50,000', 'TRAPPED', '86,000'], hi: 1, tint: [217, 56, 46], kicker: 'CANNAE · 216 BC', side: 'left' },
  cta: { story: 'Hannibal never took Rome.', say: 'Hannibal never reached Rome. The subscribe button is much closer. Take it.', pill: 'CLOSE IN', note: 'a new story every week' },
  endImage: 'ofanto-painting',
  maps,
  sentences,
  scenes,
  post: {
    youtube: {
      title: "The Perfect Battle: How Hannibal Destroyed Rome's Army at Cannae",
      description: 'In 216 BC, in southern Italy, one army trapped an army far bigger than itself and killed tens of thousands of men in a single afternoon. This is the battle of Cannae — and the animated map shows exactly how Hannibal did it.\n\nWe follow Hannibal from the Alps to Cannae, see why Rome, after Trebia and Trasimene, finally decided to fight him, and watch the trap close: the cavalry round the back, the curved center giving way, the Libyans turning in. Then the aftermath: Rome\'s panic, Maharbal\'s famous warning, Scipio at Canusium — and why Schlieffen, Eisenhower and Schwarzkopf all kept coming back to this one afternoon.\n\nNumbers in ancient sources are estimates and the sources disagree (Polybius: about 70,000 Roman dead; Livy: about 45,000). We say so on screen.\n\nSubscribe for more battles, rulers and forgotten tactics.\n\nImages: public domain / CC0 via Wikimedia Commons (Cichorius, Turner, Motte, West, De Nittis, the Metropolitan Museum of Art and others). Film: "Cabiria" (1914, public domain), used as illustrative footage. Maps: schematic. Music: Mussorgsky and Grieg, public domain. Sources: Wikipedia, Polybius, Livy.\n\n#History #Hannibal #Cannae #Rome #MilitaryHistory\n\nKeywords: battle of cannae, hannibal, hannibal barca, cannae, punic wars, second punic war, hannibal vs rome, rome vs carthage, double envelopment, ancient warfare, military history, ancient rome.',
      tags: ['battle of cannae', 'cannae', 'hannibal', 'hannibal barca', 'hannibal vs rome', 'rome vs carthage', 'second punic war', 'punic wars', 'carthage', 'ancient rome', 'roman republic', 'roman army', 'roman legions', 'pincer movement', 'double envelopment', 'ancient warfare', 'ancient battles', 'military tactics', 'military history', 'ancient history', 'roman history', 'battle explained', 'history explained', 'history documentary', 'scipio africanus', 'schlieffen plan', 'kings and generals', 'greatest battles in history', 'history'],
    },
    pinned: 'Was Cannae the perfect battle, or did Hannibal waste his victory by not marching on Rome? Tell us what you think. 👇',
  },
};
delete script.voice;
writeFileSync(path.join(here, 'script.json'), JSON.stringify(script, null, 2) + '\n');
console.log(`script.json — ${sentences.length} sentences, ${scenes.length} scenes, ${sentences.reduce((n, s) => n + s.say.split(/\s+/).length, 0)} words`);
