// ---------------------------------------------------------------------------
// Player Aliases — Client API for custom system/planet names
// ---------------------------------------------------------------------------

const API_BASE = '/api';

/**
 * Get all aliases for a player.
 * Returns a map: entityId → customName
 */
export async function getPlayerAliases(playerId: string): Promise<Record<string, string>> {
  const res = await fetch(`${API_BASE}/alias?playerId=${encodeURIComponent(playerId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Failed to get aliases: ${res.status}`);
  }
  const data = await res.json();
  return data.aliases ?? {};
}

/**
 * Set or update a custom name for a system or planet.
 */
export async function setAlias(req: {
  playerId: string;
  entityType: 'system' | 'planet';
  entityId: string;
  customName: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/alias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Failed to set alias: ${res.status}`);
  }
}

/**
 * Remove a custom alias (revert to original name).
 */
export async function removeAlias(req: {
  playerId: string;
  entityType: 'system' | 'planet';
  entityId: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/alias`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `Failed to remove alias: ${res.status}`);
  }
}
