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

export async function fetchCosmicEventById(eventId: string): Promise<CosmicEvent | null> {
  if (!/^\d{1,20}$/.test(eventId)) return null;
  try {
    const res = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.event && typeof data.event.id === 'string' ? data.event as CosmicEvent : null;
  } catch {
    return null;
  }
}
