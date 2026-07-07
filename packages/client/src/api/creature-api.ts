import { authFetch } from '../auth/api-client.js';

const API_BASE = '/api';

export type CreatureGenerationStatus =
  | 'needs_revision'
  | 'blocked'
  | 'queued'
  | 'generating'
  | 'ready'
  | 'failed'
  // Photo-tier hybrid ("дослід схрещування") — portrait owned, no 3D yet.
  | 'photo_ready';

export type CreatureStage = 'juvenile' | 'adult' | 'elder' | 'legacy';

export interface CreatureTraitMutation {
  category: 'size' | 'coloring' | 'appendages' | 'bioluminescence' | 'texture';
  trait: string;
}

export interface BiosphereCreature {
  id: string;
  player_id: string;
  planet_id: string;
  name: string | null;
  description: string;
  prompt_used: string | null;
  image_url: string | null;
  glb_url: string | null;
  tripo_task_id: string | null;
  status: CreatureGenerationStatus | string;
  quarks_paid: number;
  created_at: string;
  completed_at: string | null;
  // Evolution (Еволюція біосфери — migration 041)
  vitality: number;
  stage: CreatureStage | string;
  care_days: number;
  last_care_at: string | null;
  generation: number;
  parent_id: string | null;
  traits: CreatureTraitMutation[] | null;
  // Hybridization ("дослід схрещування" — migration 042)
  parent_b_id: string | null;
  is_hybrid: boolean;
  hybrid_photo_url: string | null;
}

export interface CareResponse {
  creature?: BiosphereCreature;
  error?: string;
  reason?: string;
}

export interface EvolveResponse {
  creatureId?: string;
  status?: CreatureGenerationStatus;
  imageUrl?: string;
  quarksPaid?: number;
  newBalance?: number;
  mutations?: CreatureTraitMutation[];
  error?: string;
  reason?: string;
}

export interface CreatureGenerateResponse {
  creatureId?: string;
  status: CreatureGenerationStatus;
  reason?: string;
  cleanedPrompt?: string;
  imageUrl?: string;
  quarksPaid?: number;
  newBalance?: number;
  error?: string;
}

export interface CreatureStatusResponse {
  status: CreatureGenerationStatus;
  progress?: number;
  imageUrl?: string | null;
  glbUrl?: string | null;
}

export async function requestCreatureGeneration(planetId: string, description: string): Promise<CreatureGenerateResponse> {
  const res = await authFetch(`${API_BASE}/creatures/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planetId, description }),
  });

  const data = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) {
    throw new Error(data.error ?? `Creature generation failed: ${res.status}`);
  }
  return data as CreatureGenerateResponse;
}

export async function checkCreatureStatus(creatureId: string): Promise<CreatureStatusResponse> {
  const res = await authFetch(`${API_BASE}/creatures/status?id=${encodeURIComponent(creatureId)}&_t=${Date.now()}`, {
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) {
    throw new Error(data.error ?? `Creature status failed: ${res.status}`);
  }
  return data as CreatureStatusResponse;
}

export async function listPlanetCreatures(planetId: string): Promise<BiosphereCreature[]> {
  const res = await authFetch(`${API_BASE}/creatures/list?planetId=${encodeURIComponent(planetId)}&_t=${Date.now()}`, {
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) {
    throw new Error(data.error ?? `Creature list failed: ${res.status}`);
  }
  return (data.creatures ?? []) as BiosphereCreature[];
}

/** Daily care action (Еволюція біосфери). Resolves with the updated creature
 *  on success, or throws with `reason` set to a CareBlockReason id. */
export async function careForCreature(creatureId: string): Promise<BiosphereCreature> {
  const res = await authFetch(`${API_BASE}/creatures/care`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creatureId }),
  });

  const data: CareResponse = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok || !data.creature) {
    const err = new Error(data.error ?? `Creature care failed: ${res.status}`) as Error & { reason?: string };
    err.reason = data.reason;
    throw err;
  }
  return data.creature;
}

/** "Нове покоління" — spawns a mutated offspring from an elder creature. */
export async function evolveCreature(creatureId: string): Promise<EvolveResponse> {
  const res = await authFetch(`${API_BASE}/creatures/evolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creatureId }),
  });

  const data: EvolveResponse = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) {
    const err = new Error(data.error ?? `Evolution failed: ${res.status}`) as Error & { reason?: string };
    err.reason = data.reason;
    throw err;
  }
  return data;
}

// ── Hybridization ("дослід схрещування" — migration 042) ───────────────────

export type HybridTier = 'photo' | 'full';

export interface HybridizeResponse {
  creatureId?: string;
  status?: CreatureGenerationStatus;
  photoUrl?: string;
  traits?: CreatureTraitMutation[];
  quarksPaid?: number;
  newBalance?: number;
  error?: string;
  reason?: string;
}

export interface HybridUpgradeResponse {
  creatureId?: string;
  status?: CreatureGenerationStatus;
  quarksPaid?: number;
  newBalance?: number;
  error?: string;
  reason?: string;
}

/** Runs the hybridization experiment on two same-planet creatures. */
export async function hybridizeCreatures(
  parentAId: string,
  parentBId: string,
  tier: HybridTier,
): Promise<HybridizeResponse> {
  const res = await authFetch(`${API_BASE}/creatures/hybridize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parentAId, parentBId, tier }),
  });

  const data: HybridizeResponse = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) {
    const err = new Error(data.error ?? `Hybridization failed: ${res.status}`) as Error & { reason?: string };
    err.reason = data.reason;
    throw err;
  }
  return data;
}

/** Upgrades a photo-tier hybrid to a full 3D biosphere creature. */
export async function upgradeHybrid(creatureId: string): Promise<HybridUpgradeResponse> {
  const res = await authFetch(`${API_BASE}/creatures/hybrid-upgrade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creatureId }),
  });

  const data: HybridUpgradeResponse = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) {
    const err = new Error(data.error ?? `Hybrid upgrade failed: ${res.status}`) as Error & { reason?: string };
    err.reason = data.reason;
    throw err;
  }
  return data;
}
