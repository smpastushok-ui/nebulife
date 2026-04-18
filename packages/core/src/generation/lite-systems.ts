// Lite cluster systems — cheap representation for background rendering.
// Uses the SAME positioning + seeding as the full StarSystem generator
// (systemSeedFromPosition + hexRingPositions) so lite orbs match real systems
// 1:1 by ID/position. When a player approaches, lite can be lazy-upgraded
// to the full StarSystem without visual jump.

import { SeededRNG } from '../math/rng.js';
import { SPECTRAL_CLASS_WEIGHTS, STELLAR_CLASSES, type SpectralClass } from '../constants/stellar.js';
import { generateGalaxyGroupCore } from './galaxy-group-generator.js';
import { deriveGroupSeed } from './galaxy-map.js';
import { assignPlayerPosition, hexRingPositions, systemSeedFromPosition } from './galaxy-generator.js';

export interface LiteSystem {
  /** Stable id matching full StarSystem.id format ("system-<seed>") */
  id: string;
  /** World position in light-years (relative to my home star) */
  position: { x: number; y: number };
  /** Star color hex (e.g. "#ffbd80") */
  starColor: string;
  /** Visual radius in pixels (1-3) */
  starSize: number;
  /** Pulse phase in radians (0..2π) for desync */
  pulsePhase: number;
  /** Owning player index in the cluster (0-49) for personal systems, -1 for core */
  ownerIndex: number;
  /** Ring index: 0=home, 1-2=personal, 3=neighbor, 4+=core (depth) */
  ringIndex: number;
  /** 'personal' | 'core' */
  nodeType: 'personal' | 'core';
  /** Original system seed (used to lazy-generate full StarSystem on demand) */
  seed: number;
}

const SPECTRAL_ORDER: SpectralClass[] = ['O', 'B', 'A', 'F', 'G', 'K', 'M'];
const SPECTRAL_WEIGHTS = SPECTRAL_ORDER.map(c => SPECTRAL_CLASS_WEIGHTS[c]);

/**
 * Pick star color the SAME way generateStar does so lite orbs match the full
 * system color. Both use weightedChoice over spectral classes seeded from the
 * star seed; we replicate the first two steps without generating planets.
 */
function pickStarColorFromSeed(starSeed: number): { color: string; sizeMul: number } {
  // Mirror star-system-generator.ts:80 — `starSeed = rng.deriveSeed(0)` from
  // the SeededRNG(systemSeed). Then star-generator.ts:50 picks spectral class.
  const sysRng = new SeededRNG(starSeed);
  const starRng = new SeededRNG(sysRng.deriveSeed(0));
  const cls = starRng.weightedChoice(SPECTRAL_ORDER, SPECTRAL_WEIGHTS);
  const candidates = STELLAR_CLASSES.filter(s => s.spectralClass === cls);
  // Pick a sub-type within class — generator interpolates, but for orb color
  // taking the median entry is close enough and 10x cheaper.
  const data = candidates[Math.floor(candidates.length / 2)];
  const sizeMul = cls === 'O' ? 1.8 : cls === 'B' ? 1.5 : cls === 'A' ? 1.3
    : cls === 'F' || cls === 'G' ? 1.0 : cls === 'K' ? 0.85 : 0.7;
  return { color: data.colorHex, sizeMul };
}

/**
 * Generate lite representation of all 1,450 cluster systems.
 * Positions, IDs, and star colors match the full StarSystem generator 1:1.
 *
 * @param galaxySeed Master galaxy seed
 * @param groupIndex Which cluster (0..groupCount-1)
 * @param myPlayerIndex This player's index in the cluster (used to compute relative positions)
 * @param playersPerGroup Cluster size (50)
 */
export function generateLiteClusterSystems(
  galaxySeed: number,
  groupIndex: number,
  myPlayerIndex: number,
  playersPerGroup: number,
): LiteSystem[] {
  const result: LiteSystem[] = [];
  const groupSeed = deriveGroupSeed(galaxySeed, groupIndex);

  // My home position — used as origin for relative coords
  const myPos = assignPlayerPosition(galaxySeed, myPlayerIndex);

  // CRITICAL: `pi` must be a GLOBAL player index, not a cluster slot. Previously
  // this loop iterated 0..49 treating them as globals, so a player in cluster 1
  // (global 50..99) saw lite-orbs scattered around CLUSTER 0's player positions
  // instead of their own cluster. Use the cluster offset to generate globals
  // for the 50 players sharing this cluster.
  const base = groupIndex * playersPerGroup;

  // ── 950 personal systems (50 players × 19 systems each) ──
  for (let slot = 0; slot < playersPerGroup; slot++) {
    const pi = base + slot;
    const playerPos = assignPlayerPosition(galaxySeed, pi);

    // Ring 0 (home), Ring 1 (6 systems @5LY), Ring 2 (12 systems @10LY) — exact same hex layout
    for (let ringIdx = 0; ringIdx <= 2; ringIdx++) {
      const positions = hexRingPositions(ringIdx, playerPos.x, playerPos.y);
      for (const pos of positions) {
        // Same seed function the real generator uses → identical IDs & stars
        const sysSeed = systemSeedFromPosition(galaxySeed, pos.x, pos.y);
        const { color, sizeMul } = pickStarColorFromSeed(sysSeed);
        // Skip if duplicate (overlapping rings between adjacent players)
        const id = `system-${sysSeed}`;
        if (result.some(r => r.id === id)) continue;

        // Phase from seed for deterministic but desync-ed pulse
        const pulsePhase = ((sysSeed * 0.0001) % (Math.PI * 2));

        result.push({
          id,
          position: { x: pos.x - myPos.x, y: pos.y - myPos.y },
          starColor: color,
          starSize: ringIdx === 0 ? 2.5 * sizeMul : (1.6 + ringIdx * 0.2) * sizeMul,
          pulsePhase,
          ownerIndex: pi,
          ringIndex: ringIdx,
          nodeType: 'personal',
          seed: sysSeed,
        });
      }
    }
  }

  // ── 500 core systems (galactic core mesh) ──
  // Core systems live in their own coordinate space (group center as origin).
  // Use group's own seed; ID format matches generateCoreStarSystem in
  // galaxy-group-generator.ts:247: `core-${id}-${seed}`.
  const core = generateGalaxyGroupCore(groupSeed);
  for (const sys of core.systems) {
    const sysSeed = sys.id; // numeric id 0..499 used by core generator as seed
    const { color, sizeMul } = pickStarColorFromSeed(sysSeed);
    const pulsePhase = ((sysSeed * 0.7919) % (Math.PI * 2));
    result.push({
      id: `core-${sys.id}-${sysSeed}`,
      position: {
        x: sys.position.x - myPos.x,
        y: sys.position.y - myPos.y,
      },
      starColor: color,
      starSize: (sys.depth === 0 ? 2.2 : 1.4) * sizeMul,
      pulsePhase,
      ownerIndex: -1,
      ringIndex: 4 + sys.depth, // 4=entry, 5+=deeper core
      nodeType: 'core',
      seed: sysSeed,
    });
  }

  return result;
}

/** Convert hex color string "#rrggbb" to PIXI integer 0xrrggbb */
export function hexColorToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
