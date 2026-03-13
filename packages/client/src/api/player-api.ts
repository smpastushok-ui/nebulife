// ---------------------------------------------------------------------------
// Player API — Client-side wrapper for Neon DB operations
// ---------------------------------------------------------------------------
// Communicates with /api/player/*, /api/discoveries/*, /api/gallery/*
// ---------------------------------------------------------------------------

import { authFetch } from '../auth/api-client.js';

const API_BASE = '/api';

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

export interface PlayerData {
  id: string;
  name: string;
  home_system_id: string;
  home_planet_id: string;
  game_phase: string;
  science_points: number;
  login_streak: number;
  last_login: string | null;
  created_at: string;
  game_state: Record<string, unknown>;
  quarks: number;
  firebase_uid: string | null;
  auth_provider: string;
  email: string | null;
  callsign: string | null;
}

/**
 * Create a new player in the database.
 */
export async function createPlayer(data: {
  id: string;
  name: string;
  homeSystemId: string;
  homePlanetId: string;
}): Promise<PlayerData> {
  const res = await authFetch(`${API_BASE}/player/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Create player failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Get player data by ID.
 */
export async function getPlayer(playerId: string): Promise<PlayerData | null> {
  const res = await authFetch(`${API_BASE}/player/${playerId}`);

  if (res.status === 404) return null;

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Get player failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Update player data (partial update).
 */
export async function updatePlayer(
  playerId: string,
  updates: Partial<{
    game_phase: string;
    science_points: number;
    login_streak: number;
    last_login: string;
    game_state: Record<string, unknown>;
    home_system_id: string;
    home_planet_id: string;
  }>,
): Promise<PlayerData> {
  const res = await authFetch(`${API_BASE}/player/${playerId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Update player failed: ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Discoveries
// ---------------------------------------------------------------------------

export interface DiscoveryData {
  id: string;
  player_id: string;
  object_type: string;
  rarity: string;
  gallery_category: string;
  system_id: string;
  planet_id: string | null;
  photo_url: string | null;
  prompt_used: string | null;
  scientific_report: string | null;
  discovered_at: string;
}

/**
 * Save a discovery (with optional photo) to the server.
 */
export async function saveDiscoveryToServer(data: {
  id: string;
  playerId: string;
  objectType: string;
  rarity: string;
  galleryCategory: string;
  systemId: string;
  planetId?: string | null;
  photoUrl?: string | null;
}): Promise<DiscoveryData> {
  const res = await authFetch(`${API_BASE}/discoveries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Save discovery failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Get all discoveries for a player, optionally filtered by gallery category.
 */
export async function getDiscoveries(
  playerId: string,
  category?: string,
): Promise<DiscoveryData[]> {
  const params = new URLSearchParams({ playerId });
  if (category) params.set('category', category);

  const res = await authFetch(`${API_BASE}/discoveries?${params}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Get discoveries failed: ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

/**
 * Get gallery photos for a player, filtered by category.
 * Only returns discoveries that have photos.
 */
export async function getGallery(
  playerId: string,
  category?: string,
): Promise<DiscoveryData[]> {
  const params = new URLSearchParams({ playerId });
  if (category) params.set('category', category);

  const res = await authFetch(`${API_BASE}/gallery?${params}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Get gallery failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Delete a gallery photo.
 */
export async function deleteGalleryPhoto(
  id: string,
  playerId: string,
): Promise<void> {
  const params = new URLSearchParams({ id, playerId });

  const res = await authFetch(`${API_BASE}/gallery?${params}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Delete photo failed: ${res.status}`);
  }
}

