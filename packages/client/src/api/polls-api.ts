// ---------------------------------------------------------------------------
// Polls API — Client-side wrapper for the community "голосування" feature
// ---------------------------------------------------------------------------

import { authFetch } from '../auth/api-client.js';

const API_BASE = '/api';

export interface PollOptionView {
  id: string;
  labelUk: string;
  labelEn: string;
}

export interface PollPercentage {
  optionId: string;
  percentage: number;
}

/** Poll as seen by a player — before voting, only question + options are
 *  present (no results field at all). After voting, `percentages` appears —
 *  never an absolute vote count. */
export interface ActivePollView {
  id: string;
  questionUk: string;
  questionEn: string;
  options: PollOptionView[];
  status: 'active' | 'closed';
  createdAt: string;
  closesAt: string | null;
  hasVoted: boolean;
  votedOptionId?: string;
  percentages?: PollPercentage[];
}

/** Fetches the current active poll (if any) plus this player's vote state. */
export async function getActivePoll(): Promise<ActivePollView | null> {
  const res = await authFetch(`${API_BASE}/polls/active`);
  if (!res.ok) {
    throw new Error(`Failed to load active poll: ${res.status}`);
  }
  const data = (await res.json()) as { poll: ActivePollView | null };
  return data.poll;
}

export interface CastVoteResponse {
  ok: true;
  votedOptionId: string;
  percentages: PollPercentage[];
}

/** Casts a vote for one option. Server rejects a second vote for the same
 *  poll (one vote per player, per poll — enforced in the DB). */
export async function castPollVote(pollId: string, optionId: string): Promise<CastVoteResponse> {
  const res = await authFetch(`${API_BASE}/polls/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pollId, optionId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Vote failed: ${res.status}`);
  }
  return data as CastVoteResponse;
}
