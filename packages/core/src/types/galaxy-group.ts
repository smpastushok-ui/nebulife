import type { SpectralClass } from '../constants/stellar.js';

// ── Galaxy Group: 50 players + 500 core systems ──────────────

/** A single system in the core mesh (500 total per group) */
export interface CoreSystem {
  id: number;
  seed: number;
  position: { x: number; y: number; z: number };
  /** Bidirectional neighbor ids within the core mesh */
  neighbors: number[];
  /** Generation depth: 0 = entry point (near player), higher = closer to center */
  depth: number;
  /** Which player this is an entry for (depth 0 only), -1 otherwise */
  entryForPlayerIndex: number;
  spectralClass: SpectralClass;
  subType: number;
  colorHex: string;
  luminositySolar: number;
}

/** The 500 core systems forming a navigable mesh between all players */
export interface GalaxyGroupCore {
  systems: CoreSystem[];
  /** One entry system id per player (systems[entryIds[i]] is player i's entry) */
  entryIds: number[];
}

/** Complete galaxy group: 50 players + 500 core systems */
export interface GalaxyGroup {
  seed: number;
  groupIndex: number;
  core: GalaxyGroupCore;
}
