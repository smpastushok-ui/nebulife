// ---------------------------------------------------------------------------
// Messages API — Client-side wrapper for chat operations
// ---------------------------------------------------------------------------

import { authFetch } from '../auth/api-client.js';

const API_BASE = '/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MessageData {
  id: string;
  channel: string;
  sender_id: string;
  sender_name: string;
  content: string;
  created_at: string;
}

export interface DMChannelInfo {
  channel: string;
  peer_id: string;
  peer_name: string;
  last_message: string;
  last_at: string;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** Send a message to a channel. */
export async function sendMessage(
  channel: string,
  content: string,
): Promise<MessageData> {
  const res = await authFetch(`${API_BASE}/messages/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, content }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Send message failed: ${res.status}`);
  }

  return res.json();
}

/** Get messages for a channel. */
export async function getMessages(
  channel: string,
  limit: number = 50,
  after?: string,
): Promise<MessageData[]> {
  const params = new URLSearchParams({ channel, limit: String(limit) });
  if (after) params.set('after', after);

  const res = await authFetch(`${API_BASE}/messages/list?${params}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Get messages failed: ${res.status}`);
  }

  return res.json();
}

/** Get DM channels for the current player. */
export async function getDMChannels(): Promise<DMChannelInfo[]> {
  const res = await authFetch(`${API_BASE}/messages/channels`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Get channels failed: ${res.status}`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Player search (for DM)
// ---------------------------------------------------------------------------

/** Search players by callsign prefix. */
export async function searchPlayers(
  query: string,
): Promise<Array<{ id: string; callsign: string }>> {
  const params = new URLSearchParams({ q: query, limit: '10' });
  const res = await authFetch(`${API_BASE}/players/search?${params}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Search players failed: ${res.status}`);
  }

  return res.json();
}

/** Report a message for Gemini moderation. */
export async function reportMessage(
  messageId: string,
  reportedId: string,
  content: string,
  channel: string,
): Promise<void> {
  const res = await authFetch(`${API_BASE}/messages/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId, reportedId, content, channel }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Report failed: ${res.status}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a DM channel ID from two player IDs (sorted for consistency). */
export function dmChannelId(id1: string, id2: string): string {
  return id1 < id2 ? `dm:${id1}:${id2}` : `dm:${id2}:${id1}`;
}
