import { SeededRNG } from '../math/rng.js';
import {
  STELLAR_CLASSES,
  SPECTRAL_CLASS_WEIGHTS,
  type SpectralClass,
  type StellarClassData,
} from '../constants/stellar.js';
import type { CoreSystem, GalaxyGroupCore } from '../types/galaxy-group.js';
import { generateStarSystem } from './star-system-generator.js';
import type { StarSystem } from '../types/universe.js';
import {
  hexToPixel,
  hexNeighbor,
  hexRing,
  PLAYER_SPACING,
  EXPANSION_START_RADIUS,
} from './galaxy-topology.js';

// ── Constants ──────────────────────────────────────────────

const NUM_PLAYERS = 50;
const RING_DISTANCE_LY = 5;
const GOLDEN_ANGLE = 2.399963;
const K_NEIGHBORS = 4;

/** Depth level counts for the 450 non-entry core systems (d1..d12) */
const DEPTH_COUNTS = [48, 52, 52, 50, 48, 46, 42, 38, 32, 24, 12, 6];
// Entry (d0): 50 + sum(DEPTH_COUNTS) = 50+450 = 500

// ── Helpers ────────────────────────────────────────────────

function dist2d(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function lerp2d(
  a: { x: number; y: number },
  b: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Assign spectral class using Milky Way distribution */
function assignSpectral(rng: SeededRNG): {
  spectralClass: SpectralClass;
  subType: number;
  colorHex: string;
  luminositySolar: number;
} {
  const classes: SpectralClass[] = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
  const weights = classes.map((c) => SPECTRAL_CLASS_WEIGHTS[c]);
  const sc = rng.weightedChoice(classes, weights);

  // Pick a matching entry from STELLAR_CLASSES
  const matching = STELLAR_CLASSES.filter((s) => s.spectralClass === sc);
  const entry = rng.pick(matching);

  return {
    spectralClass: entry.spectralClass,
    subType: entry.subType,
    colorHex: entry.colorHex,
    luminositySolar: entry.luminositySolar,
  };
}

/** Get player home hex position (golden-angle spiral) */
function getPlayerHomePixel(index: number): { x: number; y: number } {
  const angle = index * GOLDEN_ANGLE;
  const minSuperRadius = Math.ceil(EXPANSION_START_RADIUS / PLAYER_SPACING);
  const spiralRadius = minSuperRadius + Math.sqrt(index) * 1.5;
  const q = Math.round(spiralRadius * Math.cos(angle)) * PLAYER_SPACING;
  const r = Math.round(spiralRadius * Math.sin(angle)) * PLAYER_SPACING;
  return hexToPixel(q, r, RING_DISTANCE_LY);
}

// ── Main generator ─────────────────────────────────────────

/**
 * Generate the 500 core systems for a galaxy group.
 * Entry stars are placed between each player's outer ring and the center.
 * Deeper systems branch inward forming a mesh.
 * K=4 nearest neighbor edges ensure full connectivity.
 * Z-axis: gaussian, thicker near center (galaxy bulge).
 */
export function generateGalaxyGroupCore(galaxySeed: number): GalaxyGroupCore {
  const rng = new SeededRNG(galaxySeed);
  const CENTER = { x: 0, y: 0 };

  // Player positions (2D, for placement reference)
  const playerPositions: { x: number; y: number }[] = [];
  for (let i = 0; i < NUM_PLAYERS; i++) {
    playerPositions.push(getPlayerHomePixel(i));
  }

  const systems: CoreSystem[] = [];
  let nextId = 0;
  const entryIds: number[] = [];

  // ── Depth 0: 50 entry stars ──
  // Each placed between the player's position and center (35-45%)
  for (let i = 0; i < NUM_PLAYERS; i++) {
    const p = playerPositions[i];
    const t = 0.35 + rng.next() * 0.1;
    const pos = lerp2d(p, CENTER, t);
    const jx = (rng.next() - 0.5) * 8;
    const jy = (rng.next() - 0.5) * 8;

    const spec = assignSpectral(rng);
    const id = nextId++;

    systems.push({
      id,
      seed: rng.deriveSeed(id),
      position: { x: pos.x + jx, y: pos.y + jy, z: 0 }, // z set later
      neighbors: [],
      depth: 0,
      entryForPlayerIndex: i,
      ...spec,
    });
    entryIds.push(id);
  }

  // ── Depth 1..12: branch inward ──
  for (let d = 0; d < DEPTH_COUNTS.length; d++) {
    const count = DEPTH_COUNTS[d];
    const depthIndex = d + 1;
    const prevDepth = systems.filter((s) => s.depth === depthIndex - 1);

    for (let i = 0; i < count; i++) {
      const parentIdx = i % prevDepth.length;
      const parent = prevDepth[parentIdx];

      const shrink = 0.25 + rng.next() * 0.2;
      const basePos = lerp2d(parent.position, CENTER, shrink);
      const distFromCenter = dist2d(basePos, CENTER);
      const spreadAngle = (rng.next() - 0.5) * 1.2 / (1 + depthIndex * 0.15);
      const baseAngle = Math.atan2(basePos.y, basePos.x) + spreadAngle;
      const finalR = distFromCenter;

      const fx = finalR * Math.cos(baseAngle);
      const fy = finalR * Math.sin(baseAngle);
      const jx = (rng.next() - 0.5) * 4;
      const jy = (rng.next() - 0.5) * 4;

      const spec = assignSpectral(rng);
      const id = nextId++;

      systems.push({
        id,
        seed: rng.deriveSeed(id),
        position: { x: fx + jx, y: fy + jy, z: 0 },
        neighbors: [],
        depth: depthIndex,
        entryForPlayerIndex: -1,
        ...spec,
      });
    }
  }

  // ── 3D Z-axis: galaxy thickness ──
  // Thicker near center (bulge), thinner at edges
  const maxDist = Math.max(...systems.map((s) => dist2d(s.position, CENTER))) || 1;
  for (const sys of systems) {
    const d = dist2d(sys.position, CENTER);
    const bulgeWeight = Math.exp(-(d * d) / (80 * 80));
    const sigma = 3 + 17 * bulgeWeight;
    sys.position.z = rng.nextGaussian(0, sigma);
  }

  // ── Build edges: K nearest neighbors (bidirectional mesh) ──
  for (const sys of systems) {
    const sorted = systems
      .filter((o) => o.id !== sys.id)
      .map((o) => ({
        o,
        d: Math.sqrt(
          (sys.position.x - o.position.x) ** 2 +
          (sys.position.y - o.position.y) ** 2 +
          (sys.position.z - o.position.z) ** 2,
        ),
      }))
      .sort((a, b) => a.d - b.d);

    for (let i = 0; i < Math.min(K_NEIGHBORS, sorted.length); i++) {
      const nbr = sorted[i].o;
      if (!sys.neighbors.includes(nbr.id)) sys.neighbors.push(nbr.id);
      if (!nbr.neighbors.includes(sys.id)) nbr.neighbors.push(sys.id);
    }
  }

  // ── Connectivity enforcement ──
  const findComponent = (startId: number): Set<number> => {
    const visited = new Set<number>();
    const queue = [startId];
    visited.add(startId);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const nid of systems[cur].neighbors) {
        if (!visited.has(nid)) {
          visited.add(nid);
          queue.push(nid);
        }
      }
    }
    return visited;
  };

  let mainComp = findComponent(0);
  let iters = 0;
  while (mainComp.size < systems.length && iters < 100) {
    const outside = systems.find((s) => !mainComp.has(s.id));
    if (!outside) break;

    let bestDist = Infinity;
    let bestId = -1;
    for (const id of mainComp) {
      const d = Math.sqrt(
        (systems[id].position.x - outside.position.x) ** 2 +
        (systems[id].position.y - outside.position.y) ** 2 +
        (systems[id].position.z - outside.position.z) ** 2,
      );
      if (d < bestDist) {
        bestDist = d;
        bestId = id;
      }
    }
    if (bestId >= 0) {
      systems[bestId].neighbors.push(outside.id);
      outside.neighbors.push(bestId);
    }
    mainComp = findComponent(0);
    iters++;
  }

  return { systems, entryIds };
}

/**
 * Generate a full StarSystem from a CoreSystem metadata.
 * ringIndex = 3 + min(depth, 9) — determines research difficulty.
 * ID uses core- prefix to avoid collision with personal system-${seed} IDs.
 */
export function generateCoreStarSystem(coreSys: CoreSystem): StarSystem {
  const ringIndex = 3 + Math.min(coreSys.depth, 9);
  const system = generateStarSystem(coreSys.seed, coreSys.position, ringIndex);
  system.id = `core-${coreSys.id}-${coreSys.seed}`;
  return system;
}
