import AsyncStorage from '@react-native-async-storage/async-storage';

import { DateTally, VotingService } from './VotingService';

export * from './VotingService';

/**
 * Device-local stand-in, and the remote client behind it.
 *
 * The local one exists so the ballot can be built and reviewed before a server
 * does. It is NOT the feature: it counts only this phone's vote, so the tally
 * never crosses the threshold and the UI correctly shows its "too few votes"
 * state. That is the honest stand-in — one that quietly invented 1,204 fake
 * voters would look finished and be a lie.
 */

const STORAGE_KEY = 'history-unlocked.votes.local.v1';
const API = process.env.EXPO_PUBLIC_VOTING_API?.trim().replace(/\/+$/, '') || null;
const TIMEOUT_MS = 6000;

async function readLocal(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function localTally(dateKey: string, votes: Record<string, string>): DateTally {
  const mine = votes[dateKey] ?? null;
  return {
    dateKey,
    total: mine ? 1 : 0,
    byEvent: mine ? { [mine]: 1 } : {},
    myVote: mine,
  };
}

const localVotingService: VotingService = {
  isLocal: true,

  getTally: async (dateKey) => localTally(dateKey, await readLocal()),

  vote: async (dateKey, eventId) => {
    const votes = { ...(await readLocal()), [dateKey]: eventId };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
    } catch {
      // A vote that cannot be persisted is still worth showing back this session.
    }
    return localTally(dateKey, votes);
  },
};

async function call(path: string, init?: RequestInit): Promise<DateTally | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { accept: 'application/json', 'content-type': 'application/json', ...init?.headers },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return res.ok ? ((await res.json()) as DateTally) : null;
  } catch {
    return null;
  }
}

/**
 * A tally that cannot be reached is not a tally of zero — it is unknown, and
 * the ballot says so rather than telling a reader nobody has voted.
 */
function unreachable(dateKey: string): DateTally {
  return { dateKey, total: -1, byEvent: {}, myVote: null };
}

const remoteVotingService: VotingService = {
  isLocal: false,
  getTally: async (dateKey) =>
    (await call(`/votes/${dateKey}`)) ?? unreachable(dateKey),
  vote: async (dateKey, eventId) =>
    (await call(`/votes/${dateKey}`, { method: 'POST', body: JSON.stringify({ eventId }) })) ??
    unreachable(dateKey),
};

let service: VotingService | null = null;

export function getVotingService(): VotingService {
  service ??= API ? remoteVotingService : localVotingService;
  return service;
}

/** True when the tally could not be read at all. */
export function isTallyUnknown(tally: DateTally): boolean {
  return tally.total < 0;
}
