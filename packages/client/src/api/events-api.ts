// ---------------------------------------------------------------------------
// Cosmic events API — read-only upcoming events for the telescope/observatory
// ---------------------------------------------------------------------------

import type { CosmicEvent } from '@nebulife/core';

const API_BASE = '/api';

/**
 * Fetch upcoming cosmic events (soonest first). Public endpoint — no auth.
 * Returns [] on any failure so the UI degrades gracefully.
 */
export async function fetchUpcomingCosmicEvents(): Promise<CosmicEvent[]> {
  try {
    const res = await fetch(`${API_BASE}/events/upcoming`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.events) ? (data.events as CosmicEvent[]) : [];
  } catch {
    return [];
  }
}
