import { authFetch } from '../auth/api-client.js';

const API_BASE = '/api';

export type ShipGenerationStatus =
  | 'needs_revision'
  | 'blocked'
  | 'generating_concept'
  | 'generating_3d'
  | 'running'
  | 'ready'
  | 'failed';

export interface CustomShip {
  id: string;
  player_id: string;
  status: ShipGenerationStatus | string;
  prompt: string;
  prompt_used: string | null;
  moderation_status: string;
  moderation_reason: string | null;
  concept_url: string | null;
  tripo_task_id: string | null;
  glb_url: string | null;
  quarks_paid: number;
  created_at: string;
  completed_at: string | null;
}

export interface ShipGenerateResponse {
  shipId?: string;
  status: ShipGenerationStatus;
  reason?: string;
  cleanedPrompt?: string;
  quarksPaid?: number;
  newBalance?: number;
}

export interface ShipStatusResponse {
  status: ShipGenerationStatus;
  progress?: number;
  conceptUrl?: string | null;
  glbUrl?: string | null;
  reason?: string | null;
}

export async function requestShipGeneration(description: string): Promise<ShipGenerateResponse> {
  const res = await authFetch(`${API_BASE}/ship/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });

  const data = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) {
    throw new Error(data.error ?? `Ship generation failed: ${res.status}`);
  }
  return data as ShipGenerateResponse;
}

export async function checkShipStatus(shipId: string): Promise<ShipStatusResponse> {
  const res = await authFetch(`${API_BASE}/ship/status/${encodeURIComponent(shipId)}?_t=${Date.now()}`, {
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) {
    throw new Error(data.error ?? `Ship status failed: ${res.status}`);
  }
  return data as ShipStatusResponse;
}

export async function getPlayerShips(): Promise<CustomShip[]> {
  const res = await authFetch(`${API_BASE}/ship/list?_t=${Date.now()}`, {
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) {
    throw new Error(data.error ?? `Ship list failed: ${res.status}`);
  }
  return (data.ships ?? []) as CustomShip[];
}

export function proxyShipGlbUrl(shipId: string, glbUrl: string | null): string | null {
  if (!glbUrl) return null;
  if (glbUrl.startsWith('/api/ship/glb/')) return glbUrl;
  return `/api/ship/glb/${encodeURIComponent(shipId)}`;
}
