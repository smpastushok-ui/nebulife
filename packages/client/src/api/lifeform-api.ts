// ---------------------------------------------------------------------------
// Lifeform Genesis — Client-side API wrapper
// ---------------------------------------------------------------------------
// Communicates with /api/lifeform/* endpoints (found, list, rename,
// photo generate/status, video generate/status).
// ---------------------------------------------------------------------------

import type { DiscoveryRarity } from '@nebulife/core';

import { authFetch } from '../auth/api-client.js';

const API_BASE = '/api';

export type LifeformMediaStatus =
  | 'idle'
  | 'generating'
  | 'pending'
  | 'processing'
  | 'succeed'
  | 'failed';

export interface LifeformRecord {
  id: string;
  player_id: string;
  system_id: string | null;
  planet_id: string | null;
  source: 'found' | 'created';
  rarity: DiscoveryRarity;
  species_name: string | null;
  is_bundle: boolean;
  photo_url: string | null;
  photo_status: LifeformMediaStatus | null;
  photo_task_id: string | null;
  video_url: string | null;
  video_status: LifeformMediaStatus | null;
  video_task_id: string | null;
  quarks_paid: number;
  created_at: string;
  completed_at: string | null;
}

export interface LifeformMediaStatusResponse {
  status: LifeformMediaStatus;
  photoUrl?: string;
  videoUrl?: string;
}

/** Persist a newly found lifeform; returns the created record. */
export async function reportLifeformFound(
  playerId: string,
  rarity: DiscoveryRarity,
  opts?: { systemId?: string; planetId?: string; speciesName?: string },
): Promise<LifeformRecord> {
  const res = await authFetch(`${API_BASE}/lifeform/found`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId,
      rarity,
      ...(opts?.systemId ? { systemId: opts.systemId } : {}),
      ...(opts?.planetId ? { planetId: opts.planetId } : {}),
      ...(opts?.speciesName ? { speciesName: opts.speciesName } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.lifeform;
}

/** Genesis Lab: synthesize a lifeform (source 'created'). Deducts quarks server-side. */
export async function createLifeform(
  playerId: string,
  rarity: DiscoveryRarity,
  opts?: { systemId?: string; planetId?: string },
): Promise<{ lifeform: LifeformRecord; quarksRemaining: number | null }> {
  const res = await authFetch(`${API_BASE}/lifeform/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId,
      rarity,
      ...(opts?.systemId ? { systemId: opts.systemId } : {}),
      ...(opts?.planetId ? { planetId: opts.planetId } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

/** Get all lifeforms for a player (Archive hydration). */
export async function getPlayerLifeforms(playerId: string): Promise<LifeformRecord[]> {
  const res = await authFetch(`${API_BASE}/lifeform/list?playerId=${encodeURIComponent(playerId)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.lifeforms;
}

/** Rename a lifeform species. */
export async function renameLifeform(
  playerId: string,
  lifeformId: string,
  speciesName: string,
): Promise<LifeformRecord> {
  const res = await authFetch(`${API_BASE}/lifeform/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, lifeformId, speciesName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.lifeform;
}

/** Start Alpha-photo (4K Kling) generation. Costs quarks based on rarity. */
export async function generateLifeformPhoto(
  playerId: string,
  lifeformId: string,
  opts?: { screenWidth?: number; screenHeight?: number; planetHint?: string; planetMedium?: string },
): Promise<{ lifeformId: string; status: LifeformMediaStatus; quarksRemaining: number | null }> {
  const res = await authFetch(`${API_BASE}/lifeform/photo/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId,
      lifeformId,
      screenWidth: opts?.screenWidth ?? window.innerWidth,
      screenHeight: opts?.screenHeight ?? window.innerHeight,
      ...(opts?.planetHint ? { planetHint: opts.planetHint } : {}),
      ...(opts?.planetMedium ? { planetMedium: opts.planetMedium } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function checkLifeformPhotoStatus(lifeformId: string): Promise<LifeformMediaStatusResponse> {
  const res = await authFetch(`${API_BASE}/lifeform/photo/status/${lifeformId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Start Alpha-video generation from the completed Alpha-photo. */
export async function generateLifeformVideo(
  playerId: string,
  lifeformId: string,
): Promise<{ lifeformId: string; status: LifeformMediaStatus; quarksRemaining: number | null }> {
  const res = await authFetch(`${API_BASE}/lifeform/video/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, lifeformId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function checkLifeformVideoStatus(lifeformId: string): Promise<LifeformMediaStatusResponse> {
  const res = await authFetch(`${API_BASE}/lifeform/video/status/${lifeformId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Polling helpers
// ---------------------------------------------------------------------------

function pollMedia(
  check: (id: string) => Promise<LifeformMediaStatusResponse>,
  lifeformId: string,
  onUpdate: (status: LifeformMediaStatusResponse) => void,
  intervalMs: number,
  maxAttempts: number,
): () => void {
  let attempts = 0;
  let stopped = false;

  const poll = async () => {
    if (stopped || attempts >= maxAttempts) return;
    attempts++;
    try {
      const result = await check(lifeformId);
      onUpdate(result);
      if (result.status === 'succeed' || result.status === 'failed') return;
    } catch (err) {
      console.error('[pollLifeformMedia] Error:', err);
    }
    if (!stopped) setTimeout(poll, intervalMs);
  };

  poll();
  return () => { stopped = true; };
}

export function pollLifeformPhotoStatus(
  lifeformId: string,
  onUpdate: (status: LifeformMediaStatusResponse) => void,
  intervalMs = 3000,
  maxAttempts = 80,
): () => void {
  return pollMedia(checkLifeformPhotoStatus, lifeformId, onUpdate, intervalMs, maxAttempts);
}

export function pollLifeformVideoStatus(
  lifeformId: string,
  onUpdate: (status: LifeformMediaStatusResponse) => void,
  intervalMs = 5000,
  maxAttempts = 120,
): () => void {
  return pollMedia(checkLifeformVideoStatus, lifeformId, onUpdate, intervalMs, maxAttempts);
}
