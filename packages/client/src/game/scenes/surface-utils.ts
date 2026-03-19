/**
 * surface-utils.ts
 * Shared utilities for isometric surface rendering (SurfaceScene + SurfacePixiView).
 * Grid math, terrain classification, atlas helpers.
 */

import type { Planet, Star, PlacedBuilding, BuildingType, TerrainType } from '@nebulife/core';
import { BUILDING_DEFS } from '@nebulife/core';
import { derivePlanetVisuals } from '../rendering/PlanetVisuals.js';

// ─── Tile constants ─────────────────────────────────────────────────────────

/** Logical isometric diamond dimensions (game grid units, px at zoom=1). */
export const TILE_W = 128;   // diamond width  (= FRAME_W * scale = 256 * 0.5)
export const TILE_H = 98;    // diamond height (measured from o1.png: 196px * 0.5)

/** Sprite atlas frame dimensions (256×256 RGBA, 8 cols × 8 rows). */
export const FRAME_W = 256;
export const FRAME_H = 256;
export const ATLAS_COLS = 8;

/**
 * Anchor Y for terrain/feature sprites (anchor X is always 0.5).
 * = bottom vertex row / frame height = 228 / 256 = 0.890625
 * This aligns the sprite's diamond bottom vertex to the grid seam point.
 */
export const SPRITE_ANCHOR_Y = 228 / 256;  // 0.890625

/**
 * Tile sprite scale at zoom=1.
 * 1.01× overdraw fills the 1-2px sub-pixel seam between adjacent diamonds.
 */
export const TILE_SCALE = (TILE_W / FRAME_W) * 1.01;  // ~0.505

// ─── Atlas frame indices ─────────────────────────────────────────────────────

/** Map terrain key → atlas frame index (0-based). */
export const TERRAIN_FRAME: Record<string, number> = {
  deep_water: 0,
  water:      1,
  shore:      2,
  sand:       3,
  ground_a:   4,
  ground_b:   5,
  hills:      6,
  rock:       7,
  peak:       8,
  special:    9,
};

/** Map feature key → atlas frame index (0-based). */
export const FEATURE_FRAME: Record<string, number> = {
  tree_a:    16,
  tree_b:    17,
  rock_a:    18,
  rock_b:    19,
  mountain:  20,
  crater:    21,
  special_a: 22,
  bush:      23,
};

// ─── Grid size ───────────────────────────────────────────────────────────────

/**
 * Compute square isometric grid size (N×N) from planet radius.
 * Small planet (<4000 km) → 32, medium → 64, large → 128.
 */
export function computeIsoGridSize(radiusKm: number): number {
  if (radiusKm < 4000) return 32;
  if (radiusKm < 8000) return 64;
  return 128;
}

// ─── Isometric math ──────────────────────────────────────────────────────────

/**
 * Grid [col, row] → screen [x, y] in world-container local space.
 * Origin (0,0) is the leftmost tile of the diamond (col=0, row=0 → top point).
 */
export function gridToScreen(col: number, row: number): { x: number; y: number } {
  return {
    x: (col - row) * (TILE_W / 2),
    y: (col + row) * (TILE_H / 2),
  };
}

/**
 * Screen [sx, sy] in world-container local space → grid [col, row].
 * sy is measured from the top of the ground diamond (subtract TILE_H/2 from sprite anchor).
 */
export function screenToGrid(sx: number, sy: number): { col: number; row: number } {
  const col = Math.round((sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2);
  const row = Math.round((sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2);
  return { col, row };
}

// ─── Terrain classification ───────────────────────────────────────────────────

function getCellElevation(x: number, y: number, seed: number): number {
  const h1 = Math.sin(x * 127.1 + y * 311.7 + seed * 0.1) * 43758.5453;
  const h2 = Math.sin(x * 269.5 + y * 183.3 + seed * 0.2) * 21345.6789;
  return (h1 - Math.floor(h1)) * 0.7 + (h2 - Math.floor(h2)) * 0.3;
}

/**
 * Classify a grid cell into a TerrainType based on its deterministic elevation.
 * Matches the shader/Babylon terrain exactly (same formula as SurfaceBabylonView.tsx).
 */
export function classifyCellTerrain(
  x: number,
  y: number,
  seed: number,
  waterLevel: number,
): TerrainType {
  const elev = getCellElevation(x, y, seed);
  const wt = waterLevel * 0.65 + 0.1;
  if (elev < wt - 0.15) return 'deep_ocean';
  if (elev < wt - 0.04) return 'ocean';
  if (elev < wt)        return 'coast';
  if (elev < wt + 0.04) return 'beach';
  if (elev < wt + 0.15) return 'lowland';
  if (elev < wt + 0.30) return 'plains';
  if (elev < wt + 0.45) return 'hills';
  if (elev < wt + 0.55) return 'mountains';
  return 'peaks';
}

/**
 * Map TerrainType → atlas terrain key (used to look up TERRAIN_FRAME).
 * Handles terrain name differences between core types and atlas naming.
 */
export function terrainToAtlasKey(terrain: TerrainType, col: number, row: number): string {
  switch (terrain) {
    case 'deep_ocean': return 'deep_water';
    case 'ocean':      return 'water';
    case 'coast':      return 'shore';
    case 'beach':      return 'sand';
    case 'lowland':
    case 'plains':     return (col + row) % 2 === 0 ? 'ground_a' : 'ground_b';
    case 'hills':      return 'hills';
    case 'mountains':  return 'rock';
    case 'peaks':      return 'peak';
    default:           return 'ground_a';
  }
}

/** True if the terrain is water (not buildable). */
export function isWaterTerrain(terrain: TerrainType): boolean {
  return terrain === 'deep_ocean' || terrain === 'ocean' || terrain === 'coast';
}

/** True if the terrain is land (buildable in general). */
export function isLandTerrain(terrain: TerrainType): boolean {
  return !isWaterTerrain(terrain);
}

/**
 * Check if a cell is buildable for a given building type.
 * Replicates isCellBuildableFor() from SurfaceBabylonView.
 */
export function isCellBuildable(
  col: number,
  row: number,
  seed: number,
  waterLevel: number,
  buildingType: BuildingType,
): boolean {
  const terrain = classifyCellTerrain(col, row, seed, waterLevel);
  const def = BUILDING_DEFS[buildingType];
  if (!def) return false;
  return def.requiresTerrain.includes(terrain);
}

// ─── Monolith Rule ────────────────────────────────────────────────────────────

/**
 * Check if a cell is orthogonally adjacent (4-direction) to any placed building.
 * Used to enforce the Monolith Rule (colony must stay connected).
 */
export function isAdjacentToCity(gx: number, gy: number, buildings: PlacedBuilding[]): boolean {
  return buildings.some(
    (b) =>
      (Math.abs(b.x - gx) === 1 && b.y === gy) ||
      (b.x === gx && Math.abs(b.y - gy) === 1),
  );
}

// ─── Planet atlas type ────────────────────────────────────────────────────────

/**
 * Determine which sprite atlas to load for a planet.
 * Returns one of: 'temperate' | 'barren' | 'ice' | 'volcanic' | 'ocean'
 */
export function derivePlanetAtlasType(planet: Planet, star: Star): string {
  const waterCoverage = planet.hydrosphere?.waterCoverageFraction ?? 0;
  if (waterCoverage > 0.8) return 'ocean';
  const visuals = derivePlanetVisuals(planet, star);
  switch (Math.round(visuals.surfaceType)) {
    case 0: return 'temperate';
    case 1: return 'temperate';  // gas — fallback
    case 2: return 'ice';
    case 3: return 'volcanic';
    case 4: return 'barren';
    default: return 'barren';
  }
}

// ─── Feature picker (seeded) ──────────────────────────────────────────────────

/** Pick a feature for a land cell based on terrain type and a random float [0,1). */
export function pickFeatureKey(terrain: TerrainType, rand: number): string | null {
  switch (terrain) {
    case 'lowland':
    case 'plains':
      if (rand < 0.45) return rand < 0.22 ? 'tree_a' : 'tree_b';
      if (rand < 0.55) return 'bush';
      return null;
    case 'hills':
      if (rand < 0.30) return rand < 0.15 ? 'rock_a' : 'rock_b';
      if (rand < 0.40) return 'bush';
      return null;
    case 'mountains':
      if (rand < 0.50) return 'mountain';
      if (rand < 0.65) return rand < 0.57 ? 'rock_a' : 'rock_b';
      return null;
    case 'peaks':
      if (rand < 0.60) return 'mountain';
      if (rand < 0.75) return 'special_a';
      return null;
    case 'beach':
      if (rand < 0.10) return 'rock_a';
      return null;
    case 'coast':
      if (rand < 0.15) return 'crater';
      return null;
    default:
      return null;
  }
}
