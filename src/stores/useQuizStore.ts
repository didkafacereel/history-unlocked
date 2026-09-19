import { create } from 'zustand';

import { freshestFirst, questionsFor } from '@/data/quizGeneration';
import { useEraAccuracyStore } from '@/stores/useEraAccuracyStore';
import { useProgressionStore } from '@/stores/useProgressionStore';
import { lastAnswered, useQuizHistoryStore } from '@/stores/useQuizHistoryStore';
import { useRecallStore } from '@/stores/useRecallStore';
import { awardForQuiz } from '@/types/progression';
import { Era, HistoricalEvent, ScenarioQuestion } from '@/types/manifest';

/**
 * The Butterfly Effect quiz state machine:
 *
 *   idle → question → reveal → question → … → summary
 *
 * One transition per user action; every quiz component subscribes to the
 * single field it renders (phase, questionIndex, answers…), so a transition
 * re-renders only the panels that actually change.
 */

export const DAILY_QUESTION_COUNT = 3;

export type QuizPhase = 'idle' | 'question' | 'reveal' | 'summary';

/**
 * The event's archival backdrop, carried alongside the question.
 *
 * Only what the quiz can render. `credit` and `sourceUrl` travel with the url
 * and are never optional-by-accident: they are the licence terms for
 * public-domain and CC material, and an image shown without them is a licence
 * breach, not a styling choice. No aspect — the quiz frame contains every
 * image over a blurred copy, so it never needs to know the shape in advance.
 */
export interface QuizImage {
  url: string;
  credit?: string;
  sourceUrl?: string;
}

/**
 * A question plus the event it is about. The pairing is what lets an answer
 * feed the spaced-repetition schedule — a question on its own says nothing
 * about which piece of history the reader does or does not remember.
 */
export interface QuizItem {
  eventId: string;
  question: ScenarioQuestion;
  /** Absent only for an event with no freely-licensed art. */
  image?: QuizImage;
  /** Carried so an answer can be filed against the era it was about. */
  era: Era;
}

/**
 * Which of the three ways into the engine this round came from.
 *
 * `practice` already says whether XP is withheld, but it cannot say WHY, and
 * the debrief needs to know: a recall drill ends by going back, a simulation
 * ends by offering another round. Deriving that from a boolean would mean
 * guessing.
 */
export type QuizMode = 'daily' | 'recall' | 'simulation';

export interface AnswerRecord {
  questionId: string;
  choiceId: string;
  isCorrect: boolean;
}

interface QuizState {
  phase: QuizPhase;
  items: QuizItem[];
  questionIndex: number;
  answers: AnswerRecord[];
  /** Set once, on entering `summary`. Always 0 in practice mode. */
  xpEarned: number;
  /** Pro replay: score-only, no XP and no streak/progression recording. */
  practice: boolean;
  /**
   * True when any event in this round is marked solemn. The debrief suppresses
   * its celebration: confetti over a question about a massacre is the kind of
   * detail that costs a reader their trust in everything else the app says.
   */
  solemn: boolean;
  mode: QuizMode;

  beginDailyQuiz: (deck: HistoricalEvent[], practice?: boolean) => void;
  /** Recall drill: questions drawn over an arbitrary set of past events. */
  beginRecallDrill: (events: HistoricalEvent[]) => void;
  /** One practice round over a slice of the archive. See `simulationPlan`. */
  beginSimulation: (events: HistoricalEvent[], count: number) => void;
  selectChoice: (choiceId: string) => void;
  /** reveal → next question, or → summary after the last one. */
  advance: () => void;
  reset: () => void;
}

/** Did any event actually drawn into this round carry the solemn tone? */
function anySolemn(deck: readonly HistoricalEvent[], items: readonly QuizItem[]): boolean {
  const drawn = new Set(items.map((i) => i.eventId));
  return deck.some((e) => drawn.has(e.id) && e.sensitivity === 'solemn');
}

/**
 * Round-robin draw across the deck (first question of each event, then the
 * second, …) so the daily three spans multiple events rather than interrogating
 * one of them three times.
 *
 * Deterministic for a given deck AND a given answer history — the same day
 * serves the same quiz until the reader actually answers something. That still
 * closes the reroll: a question is marked answered at the moment it is graded,
 * so walking out mid-quiz and coming back cannot un-grade anything, it can only
 * skip past what is already scored.
 */
/** Copied once at draw time so the quiz never has to reach back for the event. */
function imageOf(event: HistoricalEvent): QuizImage | undefined {
  return event.imageUrl
    ? {
        url: event.imageUrl,
        credit: event.imageCredit,
        sourceUrl: event.imageSourceUrl,
      }
    : undefined;
}

function drawQuestions(deck: readonly HistoricalEvent[], count: number): QuizItem[] {
  const pools = deck.map((event) => ({
    event,
    questions: freshestFirst(questionsFor(event, deck), lastAnswered),
  }));

  const drawn: QuizItem[] = [];
  for (let round = 0; drawn.length < count; round++) {
    let foundAny = false;
    for (const { event, questions } of pools) {
      const question = questions[round];
      if (question) {
        foundAny = true;
        drawn.push({ eventId: event.id, question, image: imageOf(event), era: event.era });
        if (drawn.length === count) {
          break;
        }
      }
    }
    if (!foundAny) {
      break;
    }
  }
  return drawn;
}

const IDLE = {
  phase: 'idle' as const,
  items: [],
  questionIndex: 0,
  answers: [],
  xpEarned: 0,
  solemn: false,
};

export const useQuizStore = create<QuizState>()((set, get) => ({
  ...IDLE,
  practice: false,
  mode: 'daily',

  beginDailyQuiz: (deck, practice = false) => {
    const items = drawQuestions(deck, DAILY_QUESTION_COUNT);
    if (items.length === 0) {
      set({ ...IDLE, practice, mode: 'daily' });
      return;
    }
    set({
      ...IDLE,
      phase: 'question',
      items,
      practice,
      mode: 'daily',
      solemn: anySolemn(deck, items),
    });
  },

  beginRecallDrill: (events) => {
    // One question per event, so a drill sweeps as much of the backlog as it
    // can rather than dwelling on the first few. Always practice: the drill
    // must never be a second route to today's XP and streak.
    const items = drawQuestions(events, events.length);
    if (items.length === 0) {
      set({ ...IDLE, practice: true, mode: 'recall' });
      return;
    }
    set({
      ...IDLE,
      phase: 'question',
      items,
      practice: true,
      mode: 'recall',
      solemn: anySolemn(events, items),
    });
  },

  beginSimulation: (events, count) => {
    // Practice, for the same reason the recall drill is: the daily quiz is the
    // one route to XP and the streak, and an endless mode that also paid them
    // would make the daily one meaningless within a week.
    const items = drawQuestions(events, count);
    if (items.length === 0) {
      set({ ...IDLE, practice: true, mode: 'simulation' });
      return;
    }
    set({
      ...IDLE,
      phase: 'question',
      items,
      practice: true,
      mode: 'simulation',
      solemn: anySolemn(events, items),
    });
  },

  selectChoice: (choiceId) => {
    const { phase, items, questionIndex, answers } = get();
    if (phase !== 'question') {
      return;
    }
    const item = items[questionIndex];
    const choice = item?.question.choices.find((c) => c.id === choiceId);
    if (!item || !choice) {
      return;
    }
    // Graded here rather than at the summary so an abandoned quiz still counts:
    // the reader saw the answer, and the schedule should reflect that.
    useRecallStore.getState().grade(item.eventId, choice.isCorrect);
    // Right or wrong, this question has now been spent — its answer is on
    // screen. The next draw reaches for one the reader has not seen.
    useQuizHistoryStore.getState().markAnswered(item.question.id);
    // Filed against the era even in practice: see the note in the store on why
    // knowing an era is not the same kind of claim as a daily streak.
    useEraAccuracyStore.getState().record(item.era, choice.isCorrect);
    set({
      phase: 'reveal',
      answers: [
        ...answers,
        { questionId: item.question.id, choiceId: choice.id, isCorrect: choice.isCorrect },
      ],
    });
  },

  advance: () => {
    const { phase, items, questionIndex, answers, practice } = get();
    if (phase !== 'reveal') {
      return;
    }
    if (questionIndex + 1 < items.length) {
      set({ phase: 'question', questionIndex: questionIndex + 1 });
      return;
    }
    // Practice replays (a Pro perk) are score-only: no XP, no streak, no record.
    if (practice) {
      set({ phase: 'summary', xpEarned: 0 });
      return;
    }
    const correct = answers.filter((a) => a.isCorrect).length;
    const xpEarned = awardForQuiz(correct, items.length);
    useProgressionStore.getState().recordQuizResult(xpEarned);
    set({ phase: 'summary', xpEarned });
  },

  reset: () => {
    set({ ...IDLE, practice: false, mode: 'daily' });
  },
}));
