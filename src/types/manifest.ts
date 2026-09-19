/**
 * The frontend contract for the automated ingestion manifest.
 * These types mirror src/data/manifest/schema.ts (Zod) 1:1 — the schema is
 * the runtime gate, these are the compile-time view. Change them together.
 */

export type Era =
  | 'Ancient'
  | 'Classical'
  | 'Medieval'
  | 'Early Modern'
  | 'Industrial'
  | 'Modern';

/** One Blinkist-style micro-fact. Exactly one sentence of payload. */
export interface FactBlock {
  id: string;
  /** Emoji glyph rendered as the row icon (keeps phase 1 dependency-free). */
  icon: string;
  text: string;
}

export interface TacticalAsset {
  id: string;
  name: string;
  /** e.g. "≈700 longships", "2 prototype units" */
  quantity: string;
  faction: string;
}

export interface CommanderProfile {
  id: string;
  name: string;
  role: string;
  faction: string;
  portraitUrl?: string;
}

export interface StrategicImpact {
  id: string;
  /** e.g. "+50 years", "+3 centuries" — distance from the event. */
  horizon: string;
  consequence: string;
}

/** Present only on events that warrant the Tactical Deep Dive overlay. */
export interface TacticalData {
  assets: TacticalAsset[];
  commanders: CommanderProfile[];
  impacts: StrategicImpact[];
}

/** Scenario-based quiz question for the Butterfly Effect Engine. */
export interface ScenarioQuestion {
  id: string;
  /** Second-person scenario framing: "It is dawn on 11 June 1944. You…" */
  scenario: string;
  prompt: string;
  choices: QuizChoice[];
  /** Shown post-answer: the actual outcome and its ripple effects. */
  butterflyEffect: string;
}

export interface QuizChoice {
  id: string;
  text: string;
  isCorrect: boolean;
}

/** Browse/filter axis — mirrors `categorySchema`. */
export type EventCategory =
  | 'Military & Conflict'
  | 'Politics & Power'
  | 'Science & Technology'
  | 'Exploration & Discovery'
  | 'Culture & Ideas'
  | 'Society & Rights'
  | 'Disaster & Tragedy'
  | 'Sports & Games'
  | 'Nations & Empires';

/**
 * Editorial tone — mirrors `sensitivitySchema`. `solemn` silences the app's
 * celebration and collecting language on events whose subject is mass death.
 */
export type Sensitivity = 'standard' | 'solemn';

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface HistoricalEvent {
  id: string;
  /** "MM-DD" — the calendar slot this event belongs to. */
  dateKey: string;
  /** Negative for BCE. */
  year: number;
  era: Era;
  title: string;
  region: string;
  category?: EventCategory;
  /** Absent means 'standard'. Governs celebration/collecting language only. */
  sensitivity?: Sensitivity;
  /** A date the app is not allowed to miss — always leads its day. */
  cornerstone?: boolean;
  /** Voted the day's standout by readers. Baked in at publish time. */
  readersChoice?: boolean;
  /** Share of the day's votes, 0-1. */
  voteShare?: number;
  /** Where it happened — powers the future map / location layer. */
  coordinates?: Coordinates;
  imageUrl: string;
  /** Attribution line for the backdrop, e.g. "Robert F. Sargent · Public domain". */
  imageCredit?: string;
  /** width / height of the backdrop — drives the card's letterbox decision. */
  imageAspect?: number;
  /** Where the image came from (Commons file page) — the credit links here. */
  imageSourceUrl?: string;
  /** Attribution for quoted CC BY-SA text (lite pipeline); empty for our own copy. */
  textCredit?: string;
  /** English Wikipedia article this event's archival imagery is resolved from. */
  wikiTitle?: string;
  /** Longer prose shown in the read-more sheet. */
  summary?: string;
  facts: FactBlock[];
  tactical?: TacticalData;
  quizPool: ScenarioQuestion[];
  /**
   * Whether an authored pool exists, whether or not it has been fetched yet.
   * Mirrors `authored` in the schema — read it through `hasAuthoredQuiz`.
   */
  authored?: boolean;
}

/** A person a date is known for — mirrors `personEntrySchema`. */
export interface PersonEntry {
  year: number;
  name: string;
  description: string;
  wikiTitle: string;
  /** Free-licensed portrait; absent for the ~6% who have none. */
  imageUrl?: string;
  imageCredit?: string;
  imageSourceUrl?: string;
  /** A few sentences of who they were. */
  summary?: string;
}

/** Who was born and died on a date — mirrors `dayRegisterSchema`. */
export interface DayRegister {
  dateKey: string;
  births: PersonEntry[];
  deaths: PersonEntry[];
  observances: string[];
}

/** What the feed consumes after ingestion: validated, ordered, date-bound. */
export interface DailyDeck {
  dateKey: string;
  events: HistoricalEvent[];
  /** Absent for dates the register pass has not covered. */
  register?: DayRegister;
}
