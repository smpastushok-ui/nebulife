// ---------------------------------------------------------------------------
// Retention API — daily directives, cluster rating, comet event
// ---------------------------------------------------------------------------

import { authFetch } from '../auth/api-client.js';

const API_BASE = '/api';

// ── Daily directives ───────────────────────────────────────────────────────

export interface DirectiveStreakInfo {
  streak: number;
  claimedToday: boolean;
}

export async function getDirectiveStreakInfo(): Promise<DirectiveStreakInfo> {
  const res = await authFetch(`${API_BASE}/daily/claim-directives`);
  if (!res.ok) throw new Error(`directive streak failed: ${res.status}`);
  return res.json();
}

export interface DirectiveClaimResult {
  credited: number;
  newBalance: number;
  streak: number;
}

export async function claimDirectivesReward(): Promise<DirectiveClaimResult> {
  const res = await authFetch(`${API_BASE}/daily/claim-directives`, { method: 'POST' });
  if (!res.ok) throw new Error(`directive claim failed: ${res.status}`);
  return res.json();
}

// ── Galaxy rating ──────────────────────────────────────────────────────────

/** A cluster leader competing in the live galaxy top-10 (current week). */
export interface GalaxyLeaderRow {
  player_id: string;
  name: string;
  callsign: string | null;
  player_level: number;
  weekly_xp: number;
  champion_weeks: number;
  is_online: boolean;
  global_rank: number;
}

export interface ChampionRow {
  week_date: string;
  cluster_id: string;
  player_id: string;
  player_name: string;
  weekly_xp: number;
  global_rank: number | null;
  reward_quarks: number;
}

export interface RatingData {
  week: string;
  galaxy: {
    top: GalaxyLeaderRow[];
    me: {
      weeklyXp: number;
      clusterRank: number | null;
      isClusterLeader: boolean;
      globalRank: number | null;
    } | null;
  };
  hallOfFame: {
    week: string | null;
    top: ChampionRow[];
    myClusterChampion: ChampionRow | null;
  };
  achievements: {
    championWeeks: number;
    bestGlobalRank: number | null;
    top10Weeks: number;
  };
}

export async function fetchRating(): Promise<RatingData> {
  const res = await authFetch(`${API_BASE}/rating/leaderboard`);
  if (!res.ok) throw new Error(`rating failed: ${res.status}`);
  return res.json();
}

// ── Comet event ────────────────────────────────────────────────────────────

export interface CometClaimResult {
  claimed: boolean;
  occurrenceDate: string;
  quarksGranted: number;
  newBalance: number;
}

export async function claimCometReward(): Promise<CometClaimResult> {
  const res = await authFetch(`${API_BASE}/event/comet-claim`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'unknown' }));
    throw new Error(err.error ?? `comet claim failed: ${res.status}`);
  }
  return res.json();
}

// ── Live cosmic events (rogue-flyby / supernova-echo / …) ──────────────────

export interface LiveEventClaimResult {
  claimed: boolean;
  eventId: string;
  occurrenceDate: string;
  quarksGranted: number;
  newBalance: number;
}

export async function claimLiveEventReward(eventId: string): Promise<LiveEventClaimResult> {
  const res = await authFetch(`${API_BASE}/event/live-claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'unknown' }));
    throw new Error(err.error ?? `live event claim failed: ${res.status}`);
  }
  return res.json();
}

// ── Observation seasons ("Сезони спостережень") ────────────────────────────

export interface SeasonClaimResult {
  claimed: boolean;
  occurrenceId: string;
  quarksGranted: number;
  newBalance: number;
}

export async function claimSeasonReward(): Promise<SeasonClaimResult> {
  const res = await authFetch(`${API_BASE}/event/season-claim`, { method: 'POST' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'unknown' }));
    throw new Error(err.error ?? `season claim failed: ${res.status}`);
  }
  return res.json();
}
