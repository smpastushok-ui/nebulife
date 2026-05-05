import type { StarSystem } from '@nebulife/core';
import { authFetch } from '../auth/api-client.js';

const API_BASE = '/api';

export type PlanetSkinKind = 'system' | 'exosphere';
export type PlanetSkinStatus = 'generating' | 'pending' | 'processing' | 'succeed' | 'failed';

export interface PlanetSkin {
  id: string;
  planet_id: string;
  system_id: string;
  kind: PlanetSkinKind | string;
  status: PlanetSkinStatus | string;
  texture_url: string | null;
  kling_task_id: string | null;
  prompt_used: string | null;
  generated_by: string | null;
  quarks_paid: number;
  created_at: string;
  completed_at: string | null;
}

export interface PlanetSkinGenerateResponse {
  skinId: string;
  status: PlanetSkinStatus | string;
  kind: PlanetSkinKind | string;
  textureUrl?: string | null;
  quarksPaid?: number;
  quarksRemaining: number | null;
  existing?: boolean;
  prompt?: string;
}

export interface PlanetSkinStatusResponse {
  status: PlanetSkinStatus;
  textureUrl?: string | null;
  kind?: PlanetSkinKind | string;
  planetId?: string;
  systemId?: string;
}

export async function generatePlanetSkin(
  playerId: string,
  systemId: string,
  planetId: string,
  systemData: StarSystem,
  kind: PlanetSkinKind,
): Promise<PlanetSkinGenerateResponse> {
  const res = await authFetch(`${API_BASE}/planet-skin/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, systemId, planetId, systemData, kind }),
  });

  const data = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) {
    throw new Error(data.error ?? `Planet skin generation failed: ${res.status}`);
  }
  return data as PlanetSkinGenerateResponse;
}

export async function checkPlanetSkinStatus(skinId: string): Promise<PlanetSkinStatusResponse> {
  const res = await authFetch(`${API_BASE}/planet-skin/status/${encodeURIComponent(skinId)}?_t=${Date.now()}`, {
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) {
    throw new Error(data.error ?? `Planet skin status failed: ${res.status}`);
  }
  return data as PlanetSkinStatusResponse;
}

export async function listPlanetSkinsForSystem(systemId: string): Promise<PlanetSkin[]> {
  const res = await authFetch(`${API_BASE}/planet-skin/list?systemId=${encodeURIComponent(systemId)}&_t=${Date.now()}`, {
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) {
    throw new Error(data.error ?? `Planet skin list failed: ${res.status}`);
  }
  return (data.skins ?? []) as PlanetSkin[];
}

export function pollPlanetSkinStatus(
  skinId: string,
  onUpdate: (status: PlanetSkinStatusResponse) => void,
  intervalMs = 3000,
  maxAttempts = 60,
): () => void {
  let attempts = 0;
  let stopped = false;

  const poll = async () => {
    if (stopped || attempts >= maxAttempts) return;
    attempts++;
    try {
      const result = await checkPlanetSkinStatus(skinId);
      onUpdate(result);
      if (result.status === 'succeed' || result.status === 'failed') return;
    } catch (err) {
      console.error('[pollPlanetSkinStatus] Error:', err);
    }
    if (!stopped) window.setTimeout(poll, intervalMs);
  };

  void poll();
  return () => { stopped = true; };
}

