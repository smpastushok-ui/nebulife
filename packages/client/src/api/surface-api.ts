// ---------------------------------------------------------------------------
// Surface API — Client-side wrapper for surface building management
// ---------------------------------------------------------------------------

import type { PlacedBuilding, BuildingType } from '@nebulife/core';

import { authFetch } from '../auth/api-client.js';

const API_BASE = '/api';

/**
 * Get all buildings on a planet for a player.
 */
export async function getBuildings(playerId: string, planetId: string): Promise<PlacedBuilding[]> {
  const res = await authFetch(
    `${API_BASE}/surface/buildings?playerId=${encodeURIComponent(playerId)}&planetId=${encodeURIComponent(planetId)}`,
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Failed to fetch buildings: ${res.status}`);
  }

  return res.json();
}

/**
 * Place a new building on the surface.
 */
export async function placeBuilding(
  playerId: string,
  planetId: string,
  building: PlacedBuilding,
): Promise<PlacedBuilding> {
  const res = await authFetch(`${API_BASE}/surface/buildings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId,
      planetId,
      id: building.id,
      type: building.type,
      x: building.x,
      y: building.y,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Failed to place building: ${res.status}`);
  }

  return res.json();
}

/**
 * Upgrade a building (level +1).
 */
export async function upgradeBuilding(
  playerId: string,
  buildingId: string,
): Promise<PlacedBuilding> {
  const res = await authFetch(`${API_BASE}/surface/buildings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: buildingId, playerId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Failed to upgrade building: ${res.status}`);
  }

  return res.json();
}

/**
 * Remove a building from the surface.
 */
export async function removeBuilding(
  playerId: string,
  buildingId: string,
): Promise<void> {
  const res = await authFetch(`${API_BASE}/surface/buildings?id=${encodeURIComponent(buildingId)}&playerId=${encodeURIComponent(playerId)}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Failed to remove building: ${res.status}`);
  }
}

// ---------------------------------------------------------------------------
// Surface State — fog, harvested cells, bot/drone positions (persisted in DB)
// ---------------------------------------------------------------------------

export interface SurfaceStateData {
  revealedCells: string[];
  harvestedCells: [string, unknown][];
  bot: { col: number; row: number; active: boolean } | null;
  harvesters: { col: number; row: number }[];
}

/**
 * Load surface state (fog, harvests, bot, drones) from DB.
 */
export async function getSurfaceState(playerId: string, planetId: string): Promise<SurfaceStateData> {
  const res = await authFetch(
    `${API_BASE}/surface/state?playerId=${encodeURIComponent(playerId)}&planetId=${encodeURIComponent(planetId)}`,
  );
  if (!res.ok) {
    return { revealedCells: [], harvestedCells: [], bot: null, harvesters: [] };
  }
  return res.json();
}

/**
 * Save surface state to DB (partial update — only provided fields overwritten).
 */
export async function saveSurfaceState(
  playerId: string,
  planetId: string,
  data: Partial<SurfaceStateData>,
): Promise<void> {
  authFetch(`${API_BASE}/surface/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, planetId, ...data }),
  }).catch(() => { /* fire-and-forget, retry on next save */ });
}

// ---------------------------------------------------------------------------
// Surface Generation — AI satellite photo generation
// ---------------------------------------------------------------------------

export interface GenerateSurfaceRequest {
  playerId: string;
  planetId: string;
  systemId: string;
  planetData: any; // Planet type
  starData: any; // Star type
}

export interface GenerateSurfaceResponse {
  surfaceMapId: string;
  klingTaskId: string;
  status: string;
}

/**
 * Start surface photo generation for a planet.
 * Sends planet and star data to AI, returns surface map ID and task ID.
 */
export async function generateSurface(req: GenerateSurfaceRequest): Promise<GenerateSurfaceResponse> {
  const res = await authFetch(`${API_BASE}/surface/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Surface generation failed: ${res.status}`);
  }

  return res.json();
}

export interface SurfaceStatusResponse {
  status: 'generating' | 'analyzing' | 'ready' | 'failed';
  photoUrl?: string;
  zoneMap?: any;
  progress?: number;
  error?: string;
  warning?: string;
}

/**
 * Check surface generation status by ID.
 * Polls Kling task status and returns photo URL and zone map when ready.
 */
export async function checkSurfaceStatus(surfaceMapId: string): Promise<SurfaceStatusResponse> {
  const res = await authFetch(`${API_BASE}/surface/status/${encodeURIComponent(surfaceMapId)}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Failed to check surface status: ${res.status}`);
  }

  return res.json();
}
