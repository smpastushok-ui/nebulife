// Lite cluster systems — cheap representation for background rendering.
// Generates star color/size from seed without computing planets/atmosphere.
// Used by GalaxyScene to render distant unexplored systems as fuzzy orbs.

import { SeededRNG } from '../math/rng.js';
import { SPECTRAL_CLASS_WEIGHTS, STELLAR_CLASSES, type SpectralClass } from '../constants/stellar.js';
import { generateGalaxyGroupCore } from './galaxy-group-generator.js';
import { deriveGroupSeed } from './galaxy-map.js';
import { assignPlayerPosition } from './galaxy-generator.js';

export interface LiteSystem {
  /** Stable id matching full StarSystem.id format ("system-<seed>") */
  id: string;
  /** World position in light-years (relative to group center for core, or galaxy origin for personal) */
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

/** Pick a spectral class color cheaply without full star generation */
function pickStarColor(rng: SeededRNG): { color: string; sizeMul: number } {
  const cls = rng.weightedChoice(SPECTRAL_ORDER, SPECTRAL_WEIGHTS);
  const candidates = STELLAR_CLASSES.filter(s => s.spectralClass === cls);
  const data = candidates[rng.nextInt(0, candidates.length - 1)];
  // O/B (massive hot) larger visual size; M (cool dwarf) smaller
  const sizeMul = cls === 'O' ? 1.8 : cls === 'B' ? 1.5 : cls === 'A' ? 1.3
    : cls === 'F' || cls === 'G' ? 1.0 : cls === 'K' ? 0.85 : 0.7;
  return { color: data.colorHex, sizeMul };
}

/**
 * Generate lite representation of all 1,450 cluster systems.
 *
 * @param galaxySeed Master galaxy seed
 * @param groupIndex Which cluster (0..groupCount-1)
 * @param myPlayerIndex This player's index in the cluster (used to compute relative positions)
 * @returns Array of LiteSystem with positions in LY relative to my home star
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

  // ── 950 personal systems (50 players × 19 systems each) ──
  // Reuse the same hex-grid logic from galaxy-generator without full planet gen.
  for (let pi = 0; pi < playersPerGroup; pi++) {
    const playerPos = assignPlayerPosition(galaxySeed, pi);
    // Per-player seed derived deterministically (matches galaxy-generator.ts)
    const playerSeed = (galaxySeed * 31 + pi * 7919) | 0;

    // Ring 0 (home): 1 system at player position
    {
      const rng = new SeededRNG(playerSeed ^ 0x100);
      const { color, sizeMul } = pickStarColor(rng);
      const sysSeed = rng.nextInt(0, 0x7fffffff);
      result.push({
        id: `system-${sysSeed}`,
        position: { x: playerPos.x - myPos.x, y: playerPos.y - myPos.y },
        starColor: color,
        starSize: 2.5 * sizeMul,
        pulsePhase: rng.nextFloat(0, Math.PI * 2),
        ownerIndex: pi,
        ringIndex: 0,
        nodeType: 'personal',
        seed: sysSeed,
      });
    }

    // Ring 1 (6 systems at 5 LY) and Ring 2 (12 systems at 10 LY) — hex spokes
    for (let ringIdx = 1; ringIdx <= 2; ringIdx++) {
      const count = ringIdx === 1 ? 6 : 12;
      const distLY = ringIdx === 1 ? 5 : 10;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const px = playerPos.x + Math.cos(angle) * distLY;
        const py = playerPos.y + Math.sin(angle) * distLY;
        const rng = new SeededRNG(playerSeed ^ ((ringIdx * 1000 + i) | 0));
        const { color, sizeMul } = pickStarColor(rng);
        const sysSeed = rng.nextInt(0, 0x7fffffff);
        result.push({
          id: `system-${sysSeed}`,
          position: { x: px - myPos.x, y: py - myPos.y },
          starColor: color,
          starSize: (1.6 + ringIdx * 0.2) * sizeMul,
          pulsePhase: rng.nextFloat(0, Math.PI * 2),
          ownerIndex: pi,
          ringIndex: ringIdx,
          nodeType: 'personal',
          seed: sysSeed,
        });
      }
    }
  }

  // ── 500 core systems (galactic core mesh) ──
  const core = generateGalaxyGroupCore(groupSeed);
  // Core systems are positioned around the cluster center; we use group center as anchor.
  // For now, position core systems near the cluster center with their core layout.
  const groupCenterPos = { x: 0, y: 0 }; // Core is at galactic core, project as relative cluster center

  for (const sys of core.systems) {
    const rng = new SeededRNG(sys.id);
    const { color, sizeMul } = pickStarColor(rng);
    result.push({
      id: `system-core-${sys.id}`,
      position: {
        x: groupCenterPos.x + sys.position.x - myPos.x,
        y: groupCenterPos.y + sys.position.y - myPos.y,
      },
      starColor: color,
      starSize: (sys.depth === 0 ? 2.2 : 1.4) * sizeMul,
      pulsePhase: rng.nextFloat(0, Math.PI * 2),
      ownerIndex: -1,
      ringIndex: 4 + sys.depth, // 4=entry, 5+=deeper core
      nodeType: 'core',
      seed: sys.id,
    });
  }

  return result;
}

/** Convert hex color string "#rrggbb" to PIXI integer 0xrrggbb */
export function hexColorToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

