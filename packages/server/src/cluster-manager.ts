/**
 * ClusterManager — handles player-to-cluster assignment and cluster lifecycle.
 *
 * A "cluster" is a group of up to 50 players who share 500 core star systems
 * forming a navigable mesh at the center of their galaxy group. Core systems
 * are generated deterministically from the cluster's groupSeed (no DB storage
 * needed for individual systems).
 *
 * Flow when a player registers:
 * 1. Player gets a sequential global_index via the DB sequence.
 * 2. ClusterManager computes groupIndex = floor(global_index / 50).
 * 3. If that cluster doesn't exist yet, create it with deterministic position/seed.
 * 4. Assign the player to the cluster (set cluster_id, increment player_count).
 * 5. Return cluster info so the client can render the shared galaxy.
 */

import {
  GALAXY_MASTER_SEED,
  PLAYERS_PER_GROUP,
  computeGroupPosition,
  deriveGroupSeed,
  assignPlayerToGroup,
} from '@nebulife/core';

import {
  createCluster,
  incrementClusterPlayerCount,
  decrementClusterPlayerCount,
  getClusterById,
  getClusterByGroupIndex,
  getClusterPlayers,
  setPlayerCluster,
  getClusterCount,
  updateClusterPosition,
  getPlayer,
} from './db.js';

import type { ClusterRow } from './db.js';

// ── Public types ────────────────────────────────────────────────

/** Cluster info returned to API callers. */
export interface ClusterInfo {
  id: string;
  groupIndex: number;
  groupSeed: number;
  center: { x: number; y: number; z: number };
  playerCount: number;
  isFull: boolean;
}

/** Basic player info within a cluster. */
export interface ClusterMemberInfo {
  id: string;
  name: string;
  callsign: string | null;
  globalIndex: number | null;
  indexInGroup: number;
}

// ── Helpers ────────────────────────────────────────────────────

/** Convert a ClusterRow to a ClusterInfo. */
function rowToClusterInfo(row: ClusterRow): ClusterInfo {
  return {
    id: row.id,
    groupIndex: row.group_index,
    groupSeed: row.group_seed,
    center: { x: row.center_x, y: row.center_y, z: row.center_z },
    playerCount: row.player_count,
    isFull: row.is_full,
  };
}

/**
 * Compute the deterministic cluster metadata from a groupIndex.
 * Uses the galaxy spiral placement algorithm from @nebulife/core.
 */
function computeClusterMeta(groupIndex: number) {
  const groupMeta = computeGroupPosition(GALAXY_MASTER_SEED, groupIndex);
  const groupSeed = deriveGroupSeed(GALAXY_MASTER_SEED, groupIndex);
  return {
    groupIndex,
    groupSeed,
    center: groupMeta.position,
  };
}

// ── Core functions ───────────────────────────────────────────────

/**
 * Find or create the cluster for a given player global_index.
 *
 * The group assignment is deterministic: groupIndex = floor(globalIndex / 50).
 * If the cluster row doesn't exist yet, it is created with the deterministic
 * position and seed derived from the galaxy map.
 */
export async function findOrCreateClusterForPlayer(
  globalIndex: number,
): Promise<ClusterInfo> {
  const assignment = assignPlayerToGroup(globalIndex);
  const { groupIndex } = assignment;

  // Check if this cluster already exists
  let cluster = await getClusterByGroupIndex(groupIndex);

  if (!cluster) {
    // Create the cluster with deterministic position and seed
    const meta = computeClusterMeta(groupIndex);
    cluster = await createCluster(
      groupIndex,
      meta.center.x,
      meta.center.y,
      meta.center.z,
      meta.groupSeed,
    );
  }

  // If the cluster was created during backfill with placeholder values (0,0,0),
  // fix it up with the correct computed position.
  if (cluster.center_x === 0 && cluster.center_y === 0 && cluster.center_z === 0 && cluster.group_seed === 0) {
    const meta = computeClusterMeta(groupIndex);
    await updateClusterPosition(
      cluster.id,
      meta.center.x,
      meta.center.y,
      meta.center.z,
      meta.groupSeed,
    );
    cluster = {
      ...cluster,
      center_x: meta.center.x,
      center_y: meta.center.y,
      center_z: meta.center.z,
      group_seed: meta.groupSeed,
    };
  }

  return rowToClusterInfo(cluster);
}

/**
 * Assign a player to their cluster.
 *
 * Sets the player's cluster_id and increments the cluster's player_count.
 * Idempotent: if the player already has a cluster_id, this is a no-op.
 */
export async function assignPlayerToCluster(
  playerId: string,
  globalIndex: number,
): Promise<ClusterInfo> {
  // Check if player already has a cluster
  const player = await getPlayer(playerId);
  if (player?.cluster_id) {
    const existing = await getClusterById(player.cluster_id);
    if (existing) return rowToClusterInfo(existing);
  }

  // Find or create the cluster
  const clusterInfo = await findOrCreateClusterForPlayer(globalIndex);

  // Link player to cluster
  await setPlayerCluster(playerId, clusterInfo.id);
  await incrementClusterPlayerCount(clusterInfo.id);

  // Return updated info
  return {
    ...clusterInfo,
    playerCount: clusterInfo.playerCount + 1,
    isFull: clusterInfo.playerCount + 1 >= PLAYERS_PER_GROUP,
  };
}

/**
 * Remove a player from their cluster (e.g. on account deletion).
 * Decrements player_count and clears the player's cluster_id.
 */
export async function removePlayerFromCluster(playerId: string): Promise<void> {
  const player = await getPlayer(playerId);
  if (!player?.cluster_id) return;

  await decrementClusterPlayerCount(player.cluster_id);
  // Note: player row is deleted separately by deletePlayerData()
}

/**
 * Get cluster info for a player by their playerId.
 * Returns null if the player has no cluster assigned.
 */
export async function getClusterForPlayer(
  playerId: string,
): Promise<ClusterInfo | null> {
  const player = await getPlayer(playerId);
  if (!player?.cluster_id) return null;

  const cluster = await getClusterById(player.cluster_id);
  if (!cluster) return null;

  return rowToClusterInfo(cluster);
}

/**
 * Get all members of a cluster with their in-group indices.
 */
export async function getClusterMembers(
  clusterId: string,
): Promise<ClusterMemberInfo[]> {
  const cluster = await getClusterById(clusterId);
  if (!cluster) return [];

  const players = await getClusterPlayers(clusterId);

  return players.map((p) => {
    const globalIdx = p.global_index ?? 0;
    const indexInGroup = globalIdx % PLAYERS_PER_GROUP;
    return {
      id: p.id,
      name: p.name,
      callsign: p.callsign,
      globalIndex: p.global_index,
      indexInGroup,
    };
  });
}

/**
 * Get summary stats about the cluster system.
 */
export async function getClusterStats(): Promise<{
  totalClusters: number;
  totalPlayers: number;
}> {
  const totalClusters = await getClusterCount();
  // Each full cluster has 50 players; partial cluster has less.
  // We could sum player_count but getTotalPlayerCount is already available.
  return {
    totalClusters,
    totalPlayers: totalClusters * PLAYERS_PER_GROUP, // approximate upper bound
  };
}
