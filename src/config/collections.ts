import { HistoricalEvent } from '@/types/manifest';

/**
 * The Museum: themed sets an event joins the moment you read it.
 *
 * A collection is not new content — every card in it is already in the archive.
 * What it adds is a shape: "12 of 94 foundings" is a reason to open a day you
 * would otherwise have skipped, and a half-finished set is the strongest reason
 * a reader has not to walk away in month eight. The cost of leaving is visible.
 *
 * Definitions live here, in one file, because a set is editorial: which events
 * belong together is a judgement, and it should be reviewable in one place
 * rather than scattered across screens.
 */

export interface CollectionDef {
  id: string;
  glyph: string;
  title: string;
  /** One line, shown under the title. Say what the set IS, not why it's fun. */
  blurb: string;
  /**
   * Set to 'solemn' for a set whose subject is mass death. The Museum then
   * drops its collecting language: no "collected", no green completion, no
   * invitation to hunt the missing ones. It is still browsable and still shows
   * progress — it just stops behaving like a trophy case. An editorial
   * judgement, which is why it is declared here and not inferred.
   */
  tone?: 'solemn';
  /** Membership test. Pure and cheap — it runs over the whole archive. */
  matches: (event: HistoricalEvent) => boolean;
}

/** Case-insensitive search across the text an event actually carries. */
function textOf(event: HistoricalEvent): string {
  return `${event.title} ${event.summary ?? ''}`.toLowerCase();
}

function matchesAny(event: HistoricalEvent, pattern: RegExp): boolean {
  return pattern.test(textOf(event));
}

/**
 * Ordered as they appear in the Museum: the sets built on a category first
 * (complete and unambiguous), then the ones defined by what the text says,
 * which are looser but far more fun to hunt.
 */
export const COLLECTIONS: CollectionDef[] = [
  {
    id: 'foundings',
    glyph: '🗿',
    title: 'How Countries Begin',
    blurb: 'Kingdoms, republics and empires at the moment they came into being.',
    matches: (e) => e.category === 'Nations & Empires',
  },
  {
    id: 'breakthroughs',
    glyph: '🔬',
    title: 'Breakthroughs',
    blurb: 'The discoveries, inventions and launches that moved the line forward.',
    matches: (e) => e.category === 'Science & Technology',
  },
  {
    id: 'frontiers',
    glyph: '🧭',
    title: 'Frontiers',
    blurb: 'Voyages, summits and the first sight of somewhere new.',
    matches: (e) => e.category === 'Exploration & Discovery',
  },
  {
    id: 'rights',
    glyph: '✊',
    title: 'Rights Won',
    blurb: 'Protests, abolitions and the slow widening of who counts.',
    matches: (e) => e.category === 'Society & Rights',
  },
  {
    id: 'arena',
    glyph: '🏆',
    title: 'The Arena',
    blurb: 'Records, finals and the afternoons sport refused to forget.',
    matches: (e) => e.category === 'Sports & Games',
  },
  {
    id: 'reckonings',
    glyph: '🕯️',
    title: 'Days of Loss',
    blurb: 'Earthquakes, wrecks, famines and epidemics, kept on the record.',
    tone: 'solemn',
    matches: (e) => e.category === 'Disaster & Tragedy',
  },
  {
    id: 'antiquity',
    glyph: '🏺',
    title: 'Before the Middle Ages',
    blurb: 'Everything the archive holds from the ancient and classical worlds.',
    matches: (e) => e.era === 'Ancient' || e.era === 'Classical',
  },
  {
    id: 'battles',
    glyph: '⚔️',
    title: 'Named Battles',
    blurb: 'Engagements history bothered to give a name.',
    matches: (e) => matchesAny(e, /\bbattle of\b|\bsiege of\b/),
  },
  {
    id: 'space',
    glyph: '🛰️',
    title: 'The Space Age',
    blurb: 'Rockets, probes, orbits and the people who rode them.',
    matches: (e) => matchesAny(e, /\b(spacecraft|satellite|orbit|cosmonaut|astronaut|apollo|soyuz|nasa|launch vehicle)\b/),
  },
  {
    id: 'crowns',
    glyph: '👑',
    title: 'Crowns and Coups',
    blurb: 'Coronations, abdications, assassinations — power changing hands.',
    matches: (e) => matchesAny(e, /\b(crowned|coronation|abdicat|assassinat|coup|deposed|enthroned|succeeded to the throne)\b/),
  },
  {
    id: 'treaties',
    glyph: '📜',
    title: 'Terms and Treaties',
    blurb: 'Armistices, surrenders and the documents that stopped the shooting.',
    matches: (e) => matchesAny(e, /\b(treaty|armistice|peace of|surrender|ceasefire|accords?)\b/),
  },
  {
    id: 'firsts',
    glyph: '🥇',
    title: 'The First To',
    blurb: 'The first woman, the first crossing, the first anyone had ever done it.',
    matches: (e) => matchesAny(e, /\bfirst (woman|man|person|human|people|time|country|nation|state|city)\b|\bfirst-ever\b/),
  },
  {
    id: 'first-nights',
    glyph: '🎭',
    title: 'First Nights',
    blurb: 'Premieres, first editions and the day a work met its audience.',
    matches: (e) => matchesAny(e, /\b(premiere|premiered|first performed|first published|debut)\b/),
  },
  {
    id: 'bce',
    glyph: '𓂀',
    title: 'Before Year One',
    blurb: 'The rarest cards in the archive — everything dated BCE.',
    matches: (e) => e.year < 0,
  },
];
