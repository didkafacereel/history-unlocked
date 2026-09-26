/**
 * The feed's one-line summary, made to fit a card headline without an ellipsis
 * wherever the sentence allows it.
 *
 * The card holds 90 characters (four lines of `heroHeadline` on a 375dp phone,
 * and the schema's maximum), and cutting the sentence at 90 left 44% of the
 * archive — 3,568 headlines — ending in "…", most of them mid-thought:
 * "Second World War: Allied forces captured San Mari…".
 *
 * Most feed sentences are longer than 90 only because of material a headline
 * does not need. This removes it in order of how little it costs, stopping as
 * soon as the sentence fits:
 *
 *   1. parentheticals — "(pictured)", "(present-day Lima)", "(1945–1991)"
 *   2. a leading context label — "Second World War: ", "Cold War: " — the card
 *      already shows the year, and the label is the first thing that can go
 *   3. a clause boundary — the sentence up to its last comma, semicolon or dash
 *      that still keeps at least half the room
 *
 * Only if none of that fits does it cut at a word and add "…". Every step
 * deletes words and never rewrites them, so a headline can only say less than
 * its source, never something the source does not say.
 */

export const TITLE_MAX = 90;

/** Keep this much of the room at a clause cut, or the verb is usually gone. */
const MIN_CLAUSE = 45;

/**
 * Words a headline must never end on. Lower case only: case-insensitively this
 * ate the "A" of "MV Karine A", a ship's name. Same list as lite.ts.
 */
const DANGLING =
  /\s+(and|or|but|nor|the|a|an|of|in|on|at|to|from|with|by|for|as|its|his|her|their|our|into|onto|which|that|whose|than)$/;

/**
 * Words that only make sense with the clause a subordinate cut removed:
 * "evacuated … days | before the fall", "crashes immediately | after takeoff".
 * A cut that would end on one of these is not taken.
 */
const NEEDS_MORE = /\s(days|weeks|months|years|hours|minutes|seconds|moments|shortly|soon|just|immediately|only|even|long|two|three|several|hours)$/i;

function tidy(text: string): string {
  let out = text.trim();
  for (const [open, close] of [
    ['(', ')'],
    ['[', ']'],
  ] as const) {
    let depth = 0;
    let openedAt = -1;
    for (let i = 0; i < out.length; i++) {
      if (out[i] === open) {
        if (depth === 0) openedAt = i;
        depth++;
      } else if (out[i] === close) {
        depth = Math.max(0, depth - 1);
        if (depth === 0) openedAt = -1;
      }
    }
    if (depth > 0 && openedAt >= 0) out = out.slice(0, openedAt).trim();
  }
  out = out.replace(/[,;:–—-]+$/, '').trim();
  while (DANGLING.test(out)) out = out.replace(DANGLING, '').replace(/[,;:]+$/, '');
  return out.trim();
}

function withoutParentheticals(text: string): string {
  let out = text;
  // Innermost first, so "(the capital (then X))" goes in two passes.
  for (let i = 0; i < 3; i++) out = out.replace(/\s*\([^()]*\)/g, '');
  return out.replace(/\s+([,;:.])/g, '$1').replace(/\s+/g, ' ').trim();
}

/**
 * "Second World War: Allied forces …" → "Allied forces …". Only a SHORT label
 * before the first colon, and only when what follows is itself a sentence —
 * "Pope Pius IX: …" style prefixes are rare, and a colon deep in a sentence is
 * punctuation, not a label.
 */
function withoutLeadingLabel(text: string): string {
  const at = text.indexOf(': ');
  if (at < 3 || at > 45) return text;
  const rest = text.slice(at + 2).trim();
  if (rest.length < 30 || !/^[A-Z0-9"“]/.test(rest)) return text;
  return rest;
}

/**
 * Where a subordinate clause starts, with no comma to mark it: the main clause
 * before it is a finished statement ("The siege of Rouen ended | after six
 * months"). Deliberately NOT " and ": "between Ireland | and Newfoundland"
 * leaves half a pair.
 */
const SUBORDINATE = [
  ' after ',
  ' following ',
  ' during ',
  ' while ',
  ' when ',
  ' amid ',
  // Not " which ", " in which " or " where ": the point usually lives there —
  // "Reagan made a nationally televised address | in which he accepted
  // responsibility for Iran–Contra".
  ' because ',
  ' as part of ',
  ' in an attempt ',
  ' in order to ',
  ' leading to ',
  ' resulting in ',
];

/**
 * ", the largest diamond ever found," — a description of the subject set off
 * by commas, which the sentence reads fine without. Only segments that START
 * like a description (an article, a relative pronoun, "known as", "now"…):
 * a plain middle item of a list, "Britain, France, and Russia", is left alone.
 */
function withoutAppositives(text: string): string {
  // ONLY the description straight after the sentence's subject, at its start.
  // Anywhere else, the segment between two commas is as likely to be the MAIN
  // clause: "In Operation Iskra, the Red Army established a corridor to
  // Leningrad, partially easing the siege" lost the Red Army entirely.
  if (startsIntroductory(text)) return text;
  // The lookahead demands a lower-case word after the closing comma — the
  // sentence's verb ("…ever found, was discovered"). Without it, a description
  // holding a comma of its own was cut in half: "The Parliament of 1327, which
  // … to his son, Edward III, began" became "The Parliament of 1327 Edward III,
  // began". No `i` flag: it would let [a-z] accept a capital. [^,;.] — never
  // across a full stop.
  return text
    .replace(
      // (?<=\d),(?=\d) — a thousands separator is not a clause comma: "The
      // 3,106-carat Cullinan Diamond, the largest…".
      /^((?:[^,;.]|(?<=\d),(?=\d)){3,70}),\s(?:the|a|an|who|which|whose|now|then|also|later|formerly|officially|known as|nicknamed|dubbed|then called)\s[^,;.]{3,90},\s(?=[a-z])/,
      '$1 ',
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * "The Greenfield tornado, estimated to have produced winds of 309 mph" — a
 * subject and a description of it, cut before the verb ever arrived. Detected
 * by what follows the last comma kept.
 */
function endsOnDescription(cut: string): boolean {
  const at = cut.lastIndexOf(', ');
  if (at === -1) return false;
  return /^(estimated|known|located|built|designed|considered|described|said|believed|the|a|an|which|who|whose|then|now|once|also|one|part|formerly|officially|nicknamed)\b/.test(
    cut.slice(at + 2),
  );
}

/**
 * "In a conspiracy to replace the Medici family as rulers of Florence" — the
 * sentence's introductory phrase, with the main clause ("the Pazzi attacked
 * Lorenzo de' Medici") cut away after it. A cut that starts on an
 * introductory word and has not got past its first comma is only that phrase.
 */
const INTRODUCTORY =
  /^(In|During|After|Following|On|At|With|Under|Despite|Amid|As|While|When|Before|Having|To|Upon|By|Through|Since|Because|Although|Though|For|From|Unlike|Like|Once|Until|Within|Without|Against|Following)\b/;

/** "At least 48 civilians…" opens on "At" and is not an introduction. */
function startsIntroductory(text: string): boolean {
  return INTRODUCTORY.test(text) && !/^At least\b/.test(text);
}

function clauseCut(text: string, max: number): string | null {
  // A sentence that opens with an introduction ("After staging the coup,
  // General Chun Doo-hwan | declared martial law") has its main clause AFTER a
  // comma, so a comma cut keeps the frame and loses the event. Such a sentence
  // keeps its words and takes the "…" instead.
  if (startsIntroductory(text)) return null;
  const head = text.slice(0, max + 1);
  const boundaries = [', ', '; ', ' – ', ' — ', ...SUBORDINATE]
    .map((b) => head.lastIndexOf(b))
    .filter((i) => i >= MIN_CLAUSE && i <= max)
    .sort((a, b) => b - a);
  // Latest boundary first — it keeps the most — but never one that leaves the
  // headline hanging on a word that needed the rest.
  for (const at of boundaries) {
    const cut = tidy(text.slice(0, at));
    if (cut.length >= MIN_CLAUSE && !NEEDS_MORE.test(cut) && !endsOnDescription(cut)) return cut;
  }
  return null;
}

export function clean(summary: string): string {
  const one = summary
    .replace(/\s*\((pictured|depicted|shown)[^)]*\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  // The headline is the FIRST sentence. A few feed lines carry two ("…the
  // volcano erupts. Over the next several years, it devastates…"), and every
  // later step must work inside the first.
  // A full stop after a real word — not "Roe v. Wade", "St. Petersburg",
  // "Dr.", "Jr." or "U.S.", which the first version took for sentence ends.
  // The look-behind sits AFTER the letter, so it sees the whole word the full
  // stop closes ("v", "St", "Jr"); an initial ("U.S.") is upper case and never
  // matches [a-z)] to begin with.
  const stop = /[a-z)](?<!\b(?:v|vs|St|Dr|Mr|Mrs|Ms|Jr|Sr|No|Co|Inc|Ltd|Gen|Col|Lt|Mt|Ft|Capt|Sgt|Rev|Prof|approx|ca))\.\s(?=[A-Z])/.exec(one);
  const first = stop && stop.index >= 30 ? one.slice(0, stop.index + 1) : one;
  return first.replace(/[.]+$/, '');
}

export function shortHeadline(summary: string, max = TITLE_MAX): string {
  const base = clean(summary);
  if (base.length <= max) return tidy(base) || base;

  const steps = [withoutParentheticals(base)];
  steps.push(withoutLeadingLabel(steps[0]!));
  steps.push(withoutAppositives(steps[1]!));
  for (const step of steps) {
    if (step.length <= max) return tidy(step) || step;
  }
  for (const step of [...steps].reverse()) {
    const cut = clauseCut(step, max);
    if (cut) return cut;
  }

  // Nothing fits whole: the old behaviour, a word cut marked as a cut.
  const last = steps[steps.length - 1]!;
  const head = last.slice(0, max);
  const space = head.lastIndexOf(' ', max - 2);
  return `${tidy(head.slice(0, space > 40 ? space : max - 1))}…`;
}
