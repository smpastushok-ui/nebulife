// ---------------------------------------------------------------------------
// System Photo & Mission — Client-side API wrapper
// ---------------------------------------------------------------------------
// Communicates with /api/system-photo/* and /api/system-mission/* endpoints.
// ---------------------------------------------------------------------------

import type { StarSystem } from '@nebulife/core';

const API_BASE = '/api';

// ---------------------------------------------------------------------------
// System Photo (Telescope)
// ---------------------------------------------------------------------------

export interface SystemPhotoGenerateResponse {
  photoId: string;
  klingTaskId: string;
  quarksRemaining: number;
}

export interface SystemPhotoStatusResponse {
  status: 'generating' | 'pending' | 'processing' | 'succeed' | 'failed';
  photoUrl?: string;
}

export interface SystemPhotoListItem {
  id: string;
  player_id: string;
  system_id: string;
  photo_url: string | null;
  status: string;
  created_at: string;
}

/**
 * Generate a telescope photo for a star system (costs 15 quarks).
 */
export async function generateSystemPhoto(
  playerId: string,
  systemId: string,
  systemData: StarSystem,
): Promise<SystemPhotoGenerateResponse> {
  const res = await fetch(`${API_BASE}/system-photo/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, systemId, systemData }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Check the status of a system photo generation.
 */
export async function checkSystemPhotoStatus(photoId: string): Promise<SystemPhotoStatusResponse> {
  const res = await fetch(`${API_BASE}/system-photo/status/${photoId}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Get all system photos for a player.
 */
export async function getPlayerSystemPhotos(playerId: string): Promise<SystemPhotoListItem[]> {
  const res = await fetch(`${API_BASE}/system-photo/list?playerId=${encodeURIComponent(playerId)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.photos;
}

// ---------------------------------------------------------------------------
// System Mission (Video)
// ---------------------------------------------------------------------------

export interface SystemMissionGenerateResponse {
  missionId: string;
  klingTaskId: string;
  quarksRemaining: number;
}

export interface SystemMissionStatusResponse {
  status: 'generating' | 'pending' | 'processing' | 'succeed' | 'failed';
  videoUrl?: string;
}

/**
 * Send a mission to generate video from a system photo (costs 30/60 quarks).
 */
export async function generateSystemMission(
  playerId: string,
  systemId: string,
  photoId: string,
  durationType: 'short' | 'long',
  systemData: StarSystem,
): Promise<SystemMissionGenerateResponse> {
  const res = await fetch(`${API_BASE}/system-mission/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, systemId, photoId, durationType, systemData }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Check the status of a system mission (video generation).
 */
export async function checkMissionStatus(missionId: string): Promise<SystemMissionStatusResponse> {
  const res = await fetch(`${API_BASE}/system-mission/status/${missionId}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Polling helpers
// ---------------------------------------------------------------------------

/**
 * Poll system photo status until complete or failed.
 */
export function pollSystemPhotoStatus(
  photoId: string,
  onUpdate: (status: SystemPhotoStatusResponse) => void,
  intervalMs = 3000,
  maxAttempts = 60,
): () => void {
  let attempts = 0;
  let stopped = false;

  const poll = async () => {
    if (stopped || attempts >= maxAttempts) return;
    attempts++;

    try {
      const result = await checkSystemPhotoStatus(photoId);
      onUpdate(result);

      if (result.status === 'succeed' || result.status === 'failed') {
        return; // Done
      }
    } catch (err) {
      console.error('[pollSystemPhotoStatus] Error:', err);
    }

    if (!stopped) {
      setTimeout(poll, intervalMs);
    }
  };

  poll();

  return () => { stopped = true; };
}

/**
 * Poll mission status until complete or failed.
 */
export function pollMissionStatus(
  missionId: string,
  onUpdate: (status: SystemMissionStatusResponse) => void,
  intervalMs = 5000,
  maxAttempts = 120,
): () => void {
  let attempts = 0;
  let stopped = false;

  const poll = async () => {
    if (stopped || attempts >= maxAttempts) return;
    attempts++;

    try {
      const result = await checkMissionStatus(missionId);
      onUpdate(result);

      if (result.status === 'succeed' || result.status === 'failed') {
        return; // Done
      }
    } catch (err) {
      console.error('[pollMissionStatus] Error:', err);
    }

    if (!stopped) {
      setTimeout(poll, intervalMs);
    }
  };

  poll();

  return () => { stopped = true; };
}
