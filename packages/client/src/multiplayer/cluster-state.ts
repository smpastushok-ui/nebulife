// ============================================================================
// Cluster shared state client — destroyed planets + colonization + presence.
//
// This module is the single source of truth for the OBJECTIVE state of the
// cluster (what every player should see the same way). Per-player overrides
// (planet/system aliases, personal nicknames) stay in localStorage and are
// applied as a presentation layer on top.
//
// Design:
//   - In-memory cache keyed by systemId, TTL 30 s
//   - On entering a system: load shared state via /api/cluster/system/:id
//   - Heartbeat every 30 s via /api/cluster/presence
//   - Write paths (claim / destroy) update local cache immediately, then sync
// ============================================================================

import { authFetch } from '../auth/api-client.js';

export interface PlanetClaim {
  cluster_id: string;
  system_id: string;
  planet_id: string;
  owner_player_id: string;
  claimed_at: string;
  colony_level: number;
  terraform_pct: number;
  owner_name_snapshot: string | null;
}

export interface PlanetDestruction {
  cluster_id: string;
  system_id: string;
  planet_id: string;
  destroyed_by_player_id: string;
  destroyed_at: string;
  orbit_au: number | null;
  reason: string | null;
}

export interface SystemSharedState {
  systemId: string;
  clusterId: string | null;
  claims: PlanetClaim[];
  destructions: PlanetDestruction[];
  fetchedAt: number;
}

export interface OnlineMember {
  player_id: string;
  cluster_id: string;
  last_heartbeat: string;
  current_scene: string | null;
  current_system_id: string | null;
  player_name: string | null;
  global_index: number | null;
}

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, SystemSharedState>();
let onlineMembers: OnlineMember[] = [];
let onlineFetchedAt = 0;

/** Get shared state for a system. Cached for 30 s; pass force=true to bypass. */
export async function getSystemSharedState(
  systemId: string,
  force = false,
): Promise<SystemSharedState> {
  const now = Date.now();
  const cached = cache.get(systemId);
  if (!force && cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }
  try {
    const res = await authFetch(`/api/cluster/system/${encodeURIComponent(systemId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as Omit<SystemSharedState, 'fetchedAt'>;
    const state: SystemSharedState = { ...data, fetchedAt: now };
    cache.set(systemId, state);
    return state;
  } catch (err) {
    console.warn('[cluster-state] fetch failed:', err);
    // Fail-safe: return last cached value, or empty state, so UI doesn't break
    if (cached) return cached;
    return { systemId, clusterId: null, claims: [], destructions: [], fetchedAt: now };
  }
}

/** Synchronous read of cached state (no network). Returns null if not loaded. */
export function getCachedSystemState(systemId: string): SystemSharedState | null {
  return cache.get(systemId) ?? null;
}

/** Check if a planet is destroyed (synchronous; reads cache). */
export function isPlanetDestroyed(systemId: string, planetId: string): boolean {
  const cached = cache.get(systemId);
  if (!cached) return false;
  return cached.destructions.some(d => d.planet_id === planetId);
}

/** All destroyed planet IDs for a system (synchronous; reads cache). */
export function getDestroyedPlanetIds(systemId: string): Set<string> {
  const cached = cache.get(systemId);
  if (!cached || cached.destructions.length === 0) return new Set();
  return new Set(cached.destructions.map(d => d.planet_id));
}

/** Get the owner of a planet (synchronous; reads cache). null = unclaimed. */
export function getPlanetOwner(systemId: string, planetId: string): PlanetClaim | null {
  const cached = cache.get(systemId);
  if (!cached) return null;
  return cached.claims.find(c => c.planet_id === planetId) ?? null;
}

/** Claim a planet for the current player. Updates cache on success. */
export async function claimPlanet(args: {
  systemId: string;
  planetId: string;
  colonyLevel?: number;
  terraformPct?: number;
}): Promise<{ ok: true; claim: PlanetClaim } | { ok: false; reason: string }> {
  try {
    const res = await authFetch('/api/cluster/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (res.status === 409) return { ok: false, reason: 'already_claimed' };
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    const data = await res.json() as { claim: PlanetClaim };
    // Optimistic cache update
    const cached = cache.get(args.systemId);
    if (cached) {
      const without = cached.claims.filter(c => c.planet_id !== args.planetId);
      cache.set(args.systemId, { ...cached, claims: [...without, data.claim] });
    }
    return { ok: true, claim: data.claim };
  } catch (err) {
    console.warn('[cluster-state] claim failed:', err);
    return { ok: false, reason: 'network' };
  }
}

/** Release a planet claim. */
export async function releaseClaim(systemId: string, planetId: string): Promise<boolean> {
  try {
    const res = await authFetch('/api/cluster/claim', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemId, planetId }),
    });
    if (res.ok) {
      const cached = cache.get(systemId);
      if (cached) {
        cache.set(systemId, {
          ...cached,
          claims: cached.claims.filter(c => c.planet_id !== planetId),
        });
      }
      return true;
    }
    return false;
  } catch { return false; }
}

/** Record a planet destruction event. */
export async function recordDestruction(args: {
  systemId: string;
  planetId: string;
  orbitAU?: number;
  reason?: 'doomsday' | 'impactor' | 'collision' | 'unknown';
}): Promise<boolean> {
  try {
    const res = await authFetch('/api/cluster/destroy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (res.ok) {
      // Optimistic cache update — append placeholder destruction
      const cached = cache.get(args.systemId);
      if (cached && !cached.destructions.some(d => d.planet_id === args.planetId)) {
        cache.set(args.systemId, {
          ...cached,
          destructions: [...cached.destructions, {
            cluster_id: cached.clusterId ?? '',
            system_id: args.systemId,
            planet_id: args.planetId,
            destroyed_by_player_id: '',
            destroyed_at: new Date().toISOString(),
            orbit_au: args.orbitAU ?? null,
            reason: args.reason ?? 'unknown',
          }],
        });
      }
      return true;
    }
    return false;
  } catch { return false; }
}

/**
 * Heartbeat — call every ~30 s while playing. Returns online cluster members.
 * `currentScene` is one of: home-intro|galaxy|system|planet-view|surface|arena|hangar.
 */
export async function sendHeartbeat(args: {
  currentScene: string | null;
  currentSystemId: string | null;
}): Promise<OnlineMember[]> {
  try {
    const res = await authFetch('/api/cluster/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    if (!res.ok) return onlineMembers;
    const data = await res.json() as { online: OnlineMember[] };
    onlineMembers = data.online ?? [];
    onlineFetchedAt = Date.now();
    return onlineMembers;
  } catch { return onlineMembers; }
}

/** Synchronous read of last-known online members (no network). */
export function getOnlineMembers(): OnlineMember[] { return onlineMembers; }
export function getOnlineFetchedAt(): number { return onlineFetchedAt; }

/** Clear all caches — call on sign-out / cluster change. */
export function clearClusterStateCache(): void {
  cache.clear();
  onlineMembers = [];
  onlineFetchedAt = 0;
}
