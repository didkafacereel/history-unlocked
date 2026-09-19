/**
 * Readers' choice — one vote per Pro reader per calendar date.
 *
 * The read path of this app is a static JSON on a CDN, and it stays that way:
 * the app only ever WRITES a vote here. The badge and the ordering the vote
 * eventually affects are baked into the manifest by the pipeline at publish
 * time, so the feed keeps working offline, keeps working if this service is
 * down, and never waits on a network call to draw a card.
 *
 * What the ballot reads live is only the tally, and only once you have voted.
 *
 * Provider resolution mirrors billing and founders:
 *   no EXPO_PUBLIC_VOTING_API → device-local stand-in
 *   configured                → remote
 */

/**
 * Votes needed before a tally is shown or a badge is awarded.
 *
 * Below this a distribution is not a distribution, it is seven people. Showing
 * percentages over a handful of votes invents a consensus that does not exist,
 * and on a date where the crowd disagrees with the editor that invention would
 * be the app contradicting itself on no evidence.
 */
export const VOTE_THRESHOLD = 10;

export interface DateTally {
  dateKey: string;
  /** Total votes cast on this date, across all events. */
  total: number;
  /** Votes per event id. Only present once `total` reaches the threshold. */
  byEvent: Record<string, number>;
  /** The event this reader voted for, or null. */
  myVote: string | null;
}

export interface VotingService {
  /** What this reader has voted, and the tally if it is showable. */
  getTally(dateKey: string): Promise<DateTally>;
  /** Cast or change a vote. Returns the tally as it stands afterwards. */
  vote(dateKey: string, eventId: string): Promise<DateTally>;
  /** True for the device-local stand-in, so the UI can say so. */
  readonly isLocal: boolean;
}

/** The winner, or null when the vote is too thin to call one. */
export function winnerOf(tally: DateTally): string | null {
  if (tally.total < VOTE_THRESHOLD) {
    return null;
  }
  let best: string | null = null;
  let bestVotes = 0;
  for (const [eventId, votes] of Object.entries(tally.byEvent)) {
    // Ties keep the earlier winner rather than flipping on id order — a badge
    // that moves between two events at equal votes reads as a bug.
    if (votes > bestVotes) {
      best = eventId;
      bestVotes = votes;
    }
  }
  return best;
}
