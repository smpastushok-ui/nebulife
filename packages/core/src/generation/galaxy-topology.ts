import { SeededRNG } from '../math/rng.js';

// ===== Hex Grid Topology for Multiplayer Galaxy =====

/** Axial hex coordinates */
export interface HexCoord {
  q: number;
  r: number;
}

/** Core zone NPC system info */
export interface CoreSystemInfo {
  coord: HexCoord;
  seed: number;
  /** Hex distance from galactic center (0,0) */
  distFromCenter: number;
}

// ── Hex Math ────────────────────────────────────────────────

/** Hex distance between two axial coordinates */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dq + dr) + Math.abs(dr)) / 2;
}

/** Convert axial hex coord to pixel position (flat-top orientation) */
export function hexToPixel(q: number, r: number, size: number): { x: number; y: number } {
  const x = size * (3 / 2 * q);
  const y = size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}

/** Six axial hex directions */
const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/** Get the neighbor in direction i (0-5) */
export function hexNeighbor(coord: HexCoord, direction: number): HexCoord {
  const d = HEX_DIRECTIONS[direction % 6];
  return { q: coord.q + d.q, r: coord.r + d.r };
}

/** All hex coordinates exactly at distance `radius` from center */
export function hexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius === 0) return [{ q: center.q, r: center.r }];

  const results: HexCoord[] = [];
  // Start from direction 4 (southwest), walk radius steps
  let current: HexCoord = { q: center.q, r: center.r };
  // Move to starting position: radius steps in direction 4
  for (let i = 0; i < radius; i++) {
    current = hexNeighbor(current, 4);
  }

  // Walk around the ring
  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < radius; step++) {
      results.push({ q: current.q, r: current.r });
      current = hexNeighbor(current, side);
    }
  }

  return results;
}

/** All hex coordinates within distance `radius` from center (inclusive) */
export function hexDisk(center: HexCoord, radius: number): HexCoord[] {
  const results: HexCoord[] = [];
  for (let r = 0; r <= radius; r++) {
    results.push(...hexRing(center, r));
  }
  return results;
}

/** Canonical key for a hex coordinate */
export function hexKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

// ── Core Zone ───────────────────────────────────────────────

/** Core zone radius in hex steps */
export const CORE_RADIUS = 18;

/** Player expansion zone starts at this hex distance from center */
export const EXPANSION_START_RADIUS = 20;

/** Super-grid spacing: players are placed 5 hex-steps apart */
export const PLAYER_SPACING = 5;

/** Player cluster radius: 2 rings around home = 19 systems */
export const PLAYER_CLUSTER_RADIUS = 2;

/**
 * Generate the core zone: NPC systems from radius 0 to CORE_RADIUS.
 * Returns a map keyed by "q,r".
 */
export function generateCoreZone(galaxySeed: number): Map<string, CoreSystemInfo> {
  const systems = new Map<string, CoreSystemInfo>();
  const center: HexCoord = { q: 0, r: 0 };
  const coords = hexDisk(center, CORE_RADIUS);

  for (const coord of coords) {
    const dist = hexDistance(center, coord);
    const seed = coreSystemSeed(galaxySeed, coord);
    systems.set(hexKey(coord), { coord, seed, distFromCenter: dist });
  }

  return systems;
}

/** Deterministic seed for a core system at given hex coordinate */
function coreSystemSeed(galaxySeed: number, coord: HexCoord): number {
  let hash = galaxySeed;
  hash = Math.imul(hash ^ (coord.q + 50000), 0x45d9f3b);
  hash = Math.imul(hash ^ (coord.r + 50000), 0x45d9f3b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

// ── Player Positioning ──────────────────────────────────────

/**
 * Get player home hex coordinates using super-grid spiral.
 * Players are placed on a super-grid with spacing of PLAYER_SPACING hex-steps.
 * Super-grid coordinates (U, V) are mapped via golden-angle spiral.
 * Final hex coords = (U * PLAYER_SPACING, V * PLAYER_SPACING), offset to expansion zone.
 */
export function getPlayerHomeCoordinates(galaxySeed: number, playerIndex: number): HexCoord {
  const rng = new SeededRNG(galaxySeed);

  // Golden angle spiral on super-grid
  const goldenAngle = 2.399963; // radians
  const angle = playerIndex * goldenAngle;

  // Spiral radius grows with sqrt to fill area evenly
  // Start at radius that puts player outside core zone
  const minSuperRadius = Math.ceil(EXPANSION_START_RADIUS / PLAYER_SPACING);
  const spiralRadius = minSuperRadius + Math.sqrt(playerIndex) * 1.5;

  const U = Math.round(spiralRadius * Math.cos(angle));
  const V = Math.round(spiralRadius * Math.sin(angle));

  return {
    q: U * PLAYER_SPACING,
    r: V * PLAYER_SPACING,
  };
}

/**
 * Check if a hex coordinate is within the core zone.
 */
export function isInCoreZone(coord: HexCoord): boolean {
  return hexDistance({ q: 0, r: 0 }, coord) <= CORE_RADIUS;
}

/**
 * Check if a hex coordinate is in the expansion zone (beyond core + buffer).
 */
export function isInExpansionZone(coord: HexCoord): boolean {
  return hexDistance({ q: 0, r: 0 }, coord) >= EXPANSION_START_RADIUS;
}
