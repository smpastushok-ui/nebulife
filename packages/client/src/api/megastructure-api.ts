// ---------------------------------------------------------------------------
// Megastructure API — Client-side wrapper for "Мегаструктури кластера"
// ---------------------------------------------------------------------------

import { authFetch } from '../auth/api-client.js';

const API_BASE = '/api';

export interface MegastructureResourceBundle {
  minerals: number;
  volatiles: number;
  isotopes: number;
  water: number;
}

export interface MegastructureBuilderView {
  playerId: string;
  playerName: string;
  totalUnits: number;
  days: number;
  share: number;
  quarksAwarded: number;
  xpAwarded: number;
}

export interface MegastructureView {
  id: string;
  type: string;
  tier: number;
  status: 'building' | 'completed';
  requirements: MegastructureResourceBundle;
  progress: MegastructureResourceBundle;
  researchBonusActive: boolean;
  builders: MegastructureBuilderView[] | null;
  startedAt: string;
  completedAt: string | null;
}

export interface MegastructureCurrentResponse {
  megastructure: MegastructureView | null;
  reason?: 'no_cluster';
  progressPercent?: number;
  myContributionToday?: MegastructureResourceBundle;
  remainingCapToday?: number;
  hasContributedToday?: boolean;
  builders?: MegastructureBuilderView[];
}

export async function fetchCurrentMegastructure(): Promise<MegastructureCurrentResponse> {
  const res = await authFetch(`${API_BASE}/megastructure/current`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Megastructure fetch failed: ${res.status}`);
  }
  return data as MegastructureCurrentResponse;
}

export interface ContributeMegastructureResponse {
  megastructure: MegastructureView;
  progressPercent: number;
  applied: MegastructureResourceBundle;
  appliedTotal: number;
  remainingCapToday: number;
  isFirstContributionToday: boolean;
  xpAwarded: number;
  justCompleted: boolean;
  builders: MegastructureBuilderView[];
}

/** Contributes colony resources to the cluster's active megastructure.
 *  Deduct colony resources client-side ONLY after this call succeeds (same
 *  convention as api/creatures/care.ts — see spendResourcesAcrossPlanets). */
export async function contributeMegastructure(
  amounts: Partial<MegastructureResourceBundle>,
): Promise<ContributeMegastructureResponse> {
  const res = await authFetch(`${API_BASE}/megastructure/contribute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(amounts),
  });

  const data = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) {
    const err = new Error(data.error ?? `Contribution failed: ${res.status}`) as Error & { reason?: string };
    err.reason = data.reason;
    throw err;
  }
  return data as ContributeMegastructureResponse;
}
