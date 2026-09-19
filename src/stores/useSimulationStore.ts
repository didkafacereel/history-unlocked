import { create } from 'zustand';

import { attachQuizPools, loadAllEvents } from '@/data/ingestion';
import {
  matchesScope,
  pickRound,
  ROUND_SIZE,
  scopeKey,
  SimulationScope,
} from '@/data/simulationPlan';
import { useQuizStore } from '@/stores/useQuizStore';
import { HistoricalEvent } from '@/types/manifest';

/**
 * The endless practice mode: which slice of the archive is loaded, and the
 * round currently running over it.
 *
 * Not persisted. A run is a sitting, not a commitment — resuming a half-finished
 * practice round three days later is worse than starting a fresh one, and the
 * things that DO need to survive (which questions were answered, how well each
 * era is known) live in their own stores and already do.
 *
 * The archive loads once per scope and stays in memory for the session, so
 * "another round" is instant. That matters: the whole feature is the ability to
 * keep going, and a spinner between rounds is where a reader stops.
 */
interface SimulationState {
  scope: SimulationScope | null;
  /** Every event matching `scope`, loaded once. */
  pool: HistoricalEvent[];
  loading: boolean;
  /** 1-based, shown in the debrief so a long sitting has a shape. */
  round: number;

  /** Load the scope and start its first round. */
  start: (scope: SimulationScope) => Promise<void>;
  /** Draw a fresh round from the pool already loaded. */
  nextRound: () => void;
  /** Back to the picker. */
  clear: () => void;
}

export const useSimulationStore = create<SimulationState>()((set, get) => ({
  scope: null,
  pool: [],
  loading: false,
  round: 0,

  start: async (scope) => {
    set({ loading: true, scope, round: 0 });
    const all = await loadAllEvents();
    // The authored questions arrive in their own file. Attached once, to the
    // whole scope, so `nextRound` — which is synchronous and must stay that
    // way — never has to wait for anything.
    const pool = await attachQuizPools(all.filter((e) => matchesScope(e, scope)));
    // A scope the reader changed their mind about mid-load must not start a
    // round: the archive is megabytes and the await is long enough to matter.
    const current = get().scope;
    if (!current || scopeKey(current) !== scopeKey(scope)) {
      return;
    }
    set({ pool, loading: false, round: 1 });
    useQuizStore.getState().beginSimulation(pickRound(pool, scope, ROUND_SIZE), ROUND_SIZE);
  },

  nextRound: () => {
    const { pool, scope, round } = get();
    if (!scope || pool.length === 0) {
      return;
    }
    set({ round: round + 1 });
    useQuizStore.getState().beginSimulation(pickRound(pool, scope, ROUND_SIZE), ROUND_SIZE);
  },

  clear: () => {
    set({ scope: null, pool: [], round: 0, loading: false });
    useQuizStore.getState().reset();
  },
}));
