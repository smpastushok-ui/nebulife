// ---------------------------------------------------------------------------
// Distance helpers for terraforming logistics
// ---------------------------------------------------------------------------
//
// Note: a `distanceLY` function for doomsday-ship calculations already exists
// in `game/doomsday-ship.ts` and is exported from `game/index.ts`.  The
// version here accepts the same position shape but lives in `generation/`
// because it operates on StarSystem records during catalog queries.

/** Euclidean distance between two 3-D positions in light-years. */
export function distanceLY(
  a: { position: { x: number; y: number; z: number } },
  b: { position: { x: number; y: number; z: number } },
): number {
  return Math.sqrt(
    (a.position.x - b.position.x) ** 2 +
    (a.position.y - b.position.y) ** 2 +
    (a.position.z - b.position.z) ** 2,
  );
}

/**
 * Find the closest system (by 3-D euclidean distance) among a set of
 * colony-hub systems to a given target system.
 *
 * Returns null if `colonySystemIds` is empty or no matching system is found
 * in `allSystems`.
 *
 * Used by the Planets catalog (Phase 3) to sort planets by distance from
 * the player's nearest settlement, and by the mission dispatch modal to
 * suggest a default donor colony.
 */
export function nearestColonyDistance(
  targetSystemId: string,
  allSystems: ReadonlyArray<{ id: string; position: { x: number; y: number; z: number } }>,
  colonySystemIds: ReadonlyArray<string>,
): { systemId: string; ly: number } | null {
  if (colonySystemIds.length === 0) return null;

  const targetSystem = allSystems.find((s) => s.id === targetSystemId);
  if (!targetSystem) return null;

  // Build a fast lookup set so the inner loop is O(1) per system.
  const colonySet = new Set(colonySystemIds);

  let closestId: string | null = null;
  let closestLY = Infinity;

  for (const system of allSystems) {
    if (!colonySet.has(system.id)) continue;
    const ly = distanceLY(targetSystem, system);
    if (ly < closestLY) {
      closestLY = ly;
      closestId = system.id;
    }
  }

  if (closestId === null) return null;

  return { systemId: closestId, ly: Math.round(closestLY * 100) / 100 };
}
