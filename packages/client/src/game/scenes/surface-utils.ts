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
export const TILE_W = 128;   // diamond width  (= FRAME_W * scale ≈ 256 * 0.52)
export const TILE_H = 80;    // diamond height (measured f7/f8 atlas: 153px × 0.52 = 79.6 → 80px; MUST be even so TILE_H/2 is integer → no sub-pixel seams)

/** Sprite atlas frame dimensions (256×256 RGBA, 8 cols × 8 rows). */
export const FRAME_W = 256;
export const FRAME_H = 256;
export const ATLAS_COLS = 8;

/**
 * Anchor Y for terrain/feature sprites (anchor X is always 0.5).
 * = bottom vertex row / frame height = 207 / 256 = 0.8086
 * Measured from f7/f8 (512→256 resized): bottom tip at atlas Y=206–207.
 * This aligns the sprite's diamond bottom vertex to the grid seam point.
 */
export const SPRITE_ANCHOR_Y = 206 / 256;  // 0.8047 — нові спрайти: bottom tip at Y=205–206

/**
 * Tile sprite scale at zoom=1.
 * 1.01× overdraw fills the 1-2px sub-pixel seam between adjacent diamonds.
 */
export const TILE_SCALE = (TILE_W / FRAME_W) * 1.04;  // ~0.52 — 4% overdraw hides seams

// ─── Atlas frame indices ─────────────────────────────────────────────────────

/**
 * Atlas layout v4 (habitable planet tileset — grass + trees + harvest states):
 *   0    : o1.png               — water (1 variant)
 *   1–9  : резерв               — майбутні варіанти води
 *   10   : habitable/grass-1    — ground A (трава, 70% суші, buildable)
 *   11   : habitable/grass-2    — ground B
 *   12   : habitable/grass-3    — ground C
 *   13   : habitable/tree-big1  — tree A (30% blob, +1 ізотоп, не buildable)
 *   14   : habitable/tree-big2  — tree B
 *   15   : habitable/tree-big3  — tree C
 *   16   : habitable/f6-stump   — пень (після видобутку)
 *   17   : habitable/tree-small — молоде дерево (регенерація ч. 2)
 *
 *   --- Спрайти ресурсів для землеподібних (habitable/temperate) планет ---
 *   18   : habitable/ore-1      — ore A (кам'янисті виходи на траві, mineral deposit)
 *   19   : habitable/ore-2      — ore B
 *   20   : habitable/ore-3      — ore C
 *   21   : habitable/vent-1     — vent A (газові/водні виходи, volatile source)
 *   22   : habitable/vent-2     — vent B
 *   23   : habitable/vent-3     — vent C
 *   24   : habitable/ore-depleted — вироблена руда (ями в землі)
 *   25   : habitable/ore-small    — регенерація руди (маленькі камінці)
 *   26   : habitable/vent-dry     — висохле джерело (суха тріщина)
 *   27   : habitable/vent-small   — регенерація джерела (трохи вологи)
 *   --- Інші біоми (barren, ice, volcanic) матимуть свої набори спрайтів ---
 *
 *   28–63: резерв               — hills, peaks, ice, lava, тощо
 *
 * Tile geometry: all tiles share bottom vertex Y=207/256=0.8086, TILE_H=80px.
 * Trees extend upward (Y starts at 7–15) — taller sprites, same anchor.
 */

/** Harvest-state frame indices exported for use in SurfaceScene. */
export const STUMP_FRAME          = 16;
export const TREE_SMALL_FRAME     = 17;

/** Ore frame indices (mineral deposits). */
export const ORE_DEPLETED_FRAME   = 24;
export const ORE_SMALL_FRAME      = 25;

/** Vent frame indices (volatile sources). */
export const VENT_DRY_FRAME       = 26;
export const VENT_SMALL_FRAME     = 27;

/** Map terrain key → atlas frame index (0-based). Reference only — logic in terrainToAtlasIndex(). */
export const TERRAIN_FRAME: Record<string, number> = {
  // water
  water:    0,
  // plain ground (70% land coverage, buildable)
  grass_a:  10,  // habitable/grass-1
  grass_b:  11,  // habitable/grass-2
  grass_c:  12,  // habitable/grass-3
  // forest trees (30% land coverage, blob patches, +1 isotope)
  tree_a:   13,  // habitable/tree-big1
  tree_b:   14,  // habitable/tree-big2
  tree_c:   15,  // habitable/tree-big3
  // harvest states (tree)
  stump:    16,  // habitable/f6-stump
  tree_small: 17, // habitable/tree-small
  // ore deposits (mineral resource)
  ore_a:    18,
  ore_b:    19,
  ore_c:    20,
  // volatile vents
  vent_a:   21,
  vent_b:   22,
  vent_c:   23,
  // harvest states (ore/vent)
  ore_depleted: 24,
  ore_small:    25,
  vent_dry:     26,
  vent_small:   27,
};

/**
 * Feature decal frames (separate overlay sprites for future use).
 * NOTE: Frames 16-17 now used by forest feature tiles (f5/f6) in temperate atlas.
 * Separate decal system not used for temperate planet — trees are embedded in tiles.
 * Reserved starting at frame 32 for future dedicated decals.
 */
export const FEATURE_FRAME: Record<string, number> = {
  rock_a:    32,
  rock_b:    33,
  crater:    34,
  special_a: 35,
};

// ─── Grid size ───────────────────────────────────────────────────────────────

/**
 * Compute square isometric grid size (N×N) from planet radius.
 * Small planet (<4000 km) → 32, medium → 64, large → 128.
 */
/** Detect mobile/tablet devices using touch capability (covers large-screen phones like Samsung Ultra). */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function computeIsoGridSize(radiusKm: number): number {
  // On mobile/tablet cap to smaller grids to limit object count + GPU load
  if (isMobileDevice()) {
    if (radiusKm < 8000) return 32;   // small + medium → 32 (1 K objects vs 4 K)
    return 64;                         // large → 64 instead of 128 (4 K vs 16 K)
  }
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
 * gridToScreen(col,row).y = (col+row)*TILE_H/2 = diamond CENTER of the tile sprite.
 * Pass sy = wy directly (no offset) to map any click in the tile face to (col,row).
 */
export function screenToGrid(sx: number, sy: number): { col: number; row: number } {
  const col = Math.round((sx / (TILE_W / 2) + sy / (TILE_H / 2)) / 2);
  const row = Math.round((sy / (TILE_H / 2) - sx / (TILE_W / 2)) / 2);
  return { col, row };
}

// ─── Terrain classification ───────────────────────────────────────────────────

/**
 * Hash noise: pseudo-random value in [0,1) for a given (x,y,seed) point.
 * Used as the VALUE source for smooth noise corners.
 */
function getCellElevation(x: number, y: number, seed: number): number {
  const h1 = Math.sin(x * 127.1 + y * 311.7 + seed * 0.1) * 43758.5453;
  const h2 = Math.sin(x * 269.5 + y * 183.3 + seed * 0.2) * 21345.6789;
  return (h1 - Math.floor(h1)) * 0.7 + (h2 - Math.floor(h2)) * 0.3;
}

/**
 * Value noise (bilinear interpolation over a block grid).
 * Creates spatially-coherent, smooth elevation patches of size ~B tiles.
 * Unlike raw getCellElevation, neighboring cells have similar values → proper islands.
 *
 * @param col  grid column (integer)
 * @param row  grid row (integer)
 * @param seed planet seed
 * @param B    block size in tiles (larger = bigger islands)
 */
function valueNoise(col: number, row: number, seed: number, B: number): number {
  const bx = Math.floor(col / B);
  const by = Math.floor(row / B);
  const fx = (col - bx * B) / B;  // fractional [0,1) within block
  const fy = (row - by * B) / B;

  // Smooth interpolation weight (smoothstep: 3t²−2t³)
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  // Sample hash at 4 block corners
  const e00 = getCellElevation(bx,     by,     seed);
  const e10 = getCellElevation(bx + 1, by,     seed);
  const e01 = getCellElevation(bx,     by + 1, seed);
  const e11 = getCellElevation(bx + 1, by + 1, seed);

  // Bilinear interpolation with smooth weights
  return e00 * (1 - sx) * (1 - sy)
       + e10 *      sx  * (1 - sy)
       + e01 * (1 - sx) *      sy
       + e11 *      sx  *      sy;
}

/**
 * Multi-octave smooth elevation for terrain generation.
 * Three octaves give large islands + varied coastlines + small terrain details.
 *
 * Island mask: adds a radial gradient (higher in center, 0 at edges) so:
 *   - Center cells → reliably land
 *   - Edge cells   → reliably water
 *   - Intermediate  → noise-determined coastline
 *
 * @param N  grid size (used for normalising the island mask)
 */
function smoothElevation(col: number, row: number, seed: number, N = 64): number {
  const large  = valueNoise(col, row, seed,         10);  // island shape
  const medium = valueNoise(col, row, seed + 4321,   5);  // coastline turbulence
  const small  = valueNoise(col, row, seed + 8888,   3);  // fine terrain detail
  const noise  = large * 0.58 + medium * 0.28 + small * 0.14;

  // Radial island mask: 1.0 at centre, 0.0 at the unit-circle edge, clamped.
  // Adds at most +0.28 to the centre so noise still drives variety.
  const cx   = (col / (N - 1) - 0.5) * 2;   // [-1, 1]
  const cy   = (row / (N - 1) - 0.5) * 2;   // [-1, 1]
  const r2   = Math.min(1, cx * cx + cy * cy);
  const mask = (1 - r2) * 0.28;

  return Math.min(1, noise + mask);
}

/**
 * Classify a grid cell into a TerrainType based on smooth elevation.
 * Water covers ~30% of the map (edges forced to water via island mask).
 * Land is distributed into lowland → plains → hills → mountains → peaks.
 *
 * @param N  grid size — passed to smoothElevation for the island mask
 */
export function classifyCellTerrain(
  col: number,
  row: number,
  seed: number,
  waterLevel: number,
  N = 64,
): TerrainType {
  const e = smoothElevation(col, row, seed, N);

  // Dry planets (no hydrosphere) — no water tiles at all
  if (waterLevel <= 0) {
    if (e < 0.30) return 'lowland';
    if (e < 0.55) return 'plains';
    if (e < 0.75) return 'hills';
    if (e < 0.90) return 'mountains';
    return 'peaks';
  }

  // Thresholds calibrated for bilinear bell-curve distribution + island mask.
  // The mask shifts the centre up by ~0.28 and edges stay at noise-level (~0.5 mean).
  // Result: ~30% water concentrated at grid edges; land forms a central island.
  if (e < 0.20) return 'deep_ocean';
  if (e < 0.36) return 'ocean';
  if (e < 0.44) return 'coast';
  if (e < 0.50) return 'beach';
  if (e < 0.68) return 'lowland';
  if (e < 0.80) return 'plains';
  if (e < 0.90) return 'hills';
  if (e < 0.96) return 'mountains';
  return 'peaks';
}

/**
 * Pick a tile variant index (0–N-1) per-cell pseudo-randomly.
 * Each cell independently gets one of `count` variants — no spatial blobs,
 * pure chaotic distribution. Works best when count ≥ 8 (enough visual variety
 * that repetition isn't perceived).
 *
 * @param col    grid column
 * @param row    grid row
 * @param seed   planet seed
 * @param count  number of variants available (e.g. 10)
 * @param offset seed offset so different terrain types are independent
 */
function variantChaotic(col: number, row: number, seed: number, count: number, offset = 0): number {
  const e = getCellElevation(col, row, seed + offset);  // scale=1 → per-cell pseudo-random
  return Math.floor(e * count) % count;
}

/**
 * Returns true for ~30% of cells, arranged in organic blob patches ~8 tiles wide.
 * Entire 8×8 blocks of tiles are uniformly marked as "forest zone" or "plain zone",
 * creating natural island-like forest patches.
 */
/**
 * Forest zone classification using value noise (not block hash).
 * Produces organic blob-shaped forest patches of ~12 tiles that look connected.
 * ~30% of land cells become forest zones.
 */
function blockBlobZone(col: number, row: number, seed: number): boolean {
  // Use smooth value noise so forest patches have natural irregular shapes
  const e = valueNoise(col, row, seed + 7777, 12);  // 12-tile blobs
  return e < 0.32;  // ~32% of land cells → forest (looks ~30% after water excluded)
}

/**
 * Ore zone classification using value noise.
 * Produces ore deposit patches ~8 tiles wide on plains/hills/mountains.
 * ~10% of eligible cells become ore deposits.
 */
function oreZone(col: number, row: number, seed: number): boolean {
  const e = valueNoise(col, row, seed + 5555, 8);  // 8-tile blobs
  return e < 0.28;  // ~28% of plains/hills/mountains → ore (effective ~10% of all land)
}

/**
 * Vent zone classification using value noise.
 * Produces volatile vent patches ~6 tiles wide on coast/beach/lowland.
 * ~5% of eligible cells become vent sources.
 */
function ventZone(col: number, row: number, seed: number): boolean {
  const e = valueNoise(col, row, seed + 6666, 6);  // 6-tile blobs
  return e < 0.22;  // ~22% of coast/beach/lowland → vent (effective ~5% of all land)
}

/**
 * Per-cell deterministic float [0,1) used for grass variant selection in regrowth.
 * Different seed offset from variantChaotic to ensure independent distribution.
 */
export function cellHash(col: number, row: number, seed: number): number {
  const h = Math.sin(col * 311.7 + row * 127.1 + seed * 0.13) * 43758.5453;
  return h - Math.floor(h);
}

/** Terrain types eligible for ore deposits. */
const ORE_TERRAIN: Set<TerrainType> = new Set(['plains', 'hills', 'mountains']);

/** Terrain types eligible for vent sources. */
const VENT_TERRAIN: Set<TerrainType> = new Set(['coast', 'beach', 'lowland']);

/**
 * Map TerrainType + cell position → atlas frame index.
 *
 * Atlas layout v4 (habitable tileset):
 *   10–12: grass tiles (3 variants) — buildable
 *   13–15: tree-big tiles (3 variants) — all land, blob patches, +isotope
 *   18–20: ore tiles (3 variants) — plains/hills/mountains, +mineral
 *   21–23: vent tiles (3 variants) — coast/beach/lowland, +volatile
 *
 * Priority: tree > ore > vent > grass
 * Water terrain returns null → SurfaceScene draws it programmatically (flat
 * diamond Graphics) for perfect tessellation without sprite seams.
 */
export function terrainToAtlasIndex(
  terrain: TerrainType,
  col: number,
  row: number,
  seed: number,
  N?: number,
): number | null {
  // Water → programmatic rendering
  if (terrain === 'deep_ocean' || terrain === 'ocean') return null;

  // Mountain footprint → always plain grass (suppress resources under the mountain overlay)
  if (N !== undefined && isMountainFootprint(col, row, seed, N)) {
    return 10 + variantChaotic(col, row, seed, 3, 1111);
  }

  // Mountain ring: ore ring around mountain (trees still have priority)
  if (N !== undefined && isMountainRing(col, row, seed, N)) {
    if (blockBlobZone(col, row, seed) || mountainTreeScatter(col, row, seed, N)) {
      return 13 + variantChaotic(col, row, seed, 3, 2222);  // tree
    }
    if (mountainRingOre(col, row, seed)) {
      return 18 + variantChaotic(col, row, seed, 3, 4444);  // ore
    }
    return 10 + variantChaotic(col, row, seed, 3, 1111);    // grass gap
  }

  // Mountain tree scatter (outside the ring, on mountain slopes)
  if (N !== undefined && mountainTreeScatter(col, row, seed, N)) {
    return 13 + variantChaotic(col, row, seed, 3, 2222);    // scattered tree
  }

  // Coast/beach/lowland — can have vents or grass
  if (VENT_TERRAIN.has(terrain)) {
    // Tree zones can overlap vent terrain (priority: tree > vent > grass)
    if (blockBlobZone(col, row, seed)) {
      return 13 + variantChaotic(col, row, seed, 3, 2222);
    }
    if (ventZone(col, row, seed)) {
      return 21 + variantChaotic(col, row, seed, 3, 3333);  // vent frames 21-23
    }
    return 10 + variantChaotic(col, row, seed, 3, 1111);
  }

  // Plains/hills/mountains — can have trees, ore, or grass
  if (ORE_TERRAIN.has(terrain)) {
    if (blockBlobZone(col, row, seed)) {
      return 13 + variantChaotic(col, row, seed, 3, 2222);
    }
    if (oreZone(col, row, seed)) {
      return 18 + variantChaotic(col, row, seed, 3, 4444);  // ore frames 18-20
    }
    return 10 + variantChaotic(col, row, seed, 3, 1111);
  }

  // Peaks — only trees or grass (too high for ore/vent)
  if (terrain === 'peaks') {
    if (blockBlobZone(col, row, seed)) {
      return 13 + variantChaotic(col, row, seed, 3, 2222);
    }
    return 10 + variantChaotic(col, row, seed, 3, 1111);
  }

  return null;
}

// ─── Tile metadata ────────────────────────────────────────────────────────────

/** Semantic tile type inferred from atlas frame index. */
export type TileType =
  | 'water' | 'grass'
  | 'tree' | 'stump' | 'tree-small'
  | 'ore' | 'ore-depleted' | 'ore-small'
  | 'vent' | 'vent-dry' | 'vent-small';

/** Classify a frame index into a semantic tile type. */
export function getTileType(frameIdx: number): TileType {
  if (frameIdx === 0)                             return 'water';
  if (frameIdx >= 10 && frameIdx <= 12)          return 'grass';
  if (frameIdx >= 13 && frameIdx <= 15)          return 'tree';
  if (frameIdx === STUMP_FRAME)                  return 'stump';
  if (frameIdx === TREE_SMALL_FRAME)             return 'tree-small';
  if (frameIdx >= 18 && frameIdx <= 20)          return 'ore';
  if (frameIdx >= 21 && frameIdx <= 23)          return 'vent';
  if (frameIdx === ORE_DEPLETED_FRAME)           return 'ore-depleted';
  if (frameIdx === ORE_SMALL_FRAME)              return 'ore-small';
  if (frameIdx === VENT_DRY_FRAME)               return 'vent-dry';
  if (frameIdx === VENT_SMALL_FRAME)             return 'vent-small';
  return 'grass';
}

/** True if a building can be placed on this tile (grass only). */
export function isTileBuildable(frameIdx: number): boolean {
  return getTileType(frameIdx) === 'grass';
}

/** Isotope resource yield for this tile (1 for harvestable trees, 0 otherwise). */
export function getTileIsotopes(frameIdx: number): number {
  return getTileType(frameIdx) === 'tree' ? 1 : 0;
}

/** True if tile is harvestable (tree, ore, or vent in default state). */
export function isTileHarvestable(frameIdx: number): boolean {
  const t = getTileType(frameIdx);
  return t === 'tree' || t === 'ore' || t === 'vent';
}

/** True if the cell is a harvestable tree in its default (uncut) state. */
export function isTreeCell(col: number, row: number, seed: number, N: number, waterLevel: number): boolean {
  if (isMountainFootprint(col, row, seed, N)) return false;
  const terrain = classifyCellTerrain(col, row, seed, waterLevel, N);
  if (!isLandTerrain(terrain)) return false;
  // Forest blob zones (main source of trees)
  if (blockBlobZone(col, row, seed)) return true;
  // Scattered individual trees near the mountain slopes
  if (mountainTreeScatter(col, row, seed, N)) return true;
  return false;
}

/** True if the cell is an ore deposit in its default state. */
export function isOreCell(col: number, row: number, seed: number, N: number, waterLevel: number): boolean {
  if (isMountainFootprint(col, row, seed, N)) return false;

  const terrain = classifyCellTerrain(col, row, seed, waterLevel, N);

  // Mountain ring: ore deposits ring the mountain (~55 % of ring cells on land)
  if (isMountainRing(col, row, seed, N) && isLandTerrain(terrain)) {
    // Trees always have priority (blob forests + scattered mountain trees)
    if (blockBlobZone(col, row, seed) || mountainTreeScatter(col, row, seed, N)) return false;
    return mountainRingOre(col, row, seed);
  }

  // Normal ore generation on plains / hills / mountains
  if (!ORE_TERRAIN.has(terrain)) return false;
  // Trees always have priority (forest blobs + mountain scatter)
  if (blockBlobZone(col, row, seed)) return false;
  if (mountainTreeScatter(col, row, seed, N)) return false;
  return oreZone(col, row, seed);
}

/** True if the cell is a vent source in its default state. */
export function isVentCell(col: number, row: number, seed: number, N: number, waterLevel: number): boolean {
  if (isMountainFootprint(col, row, seed, N)) return false;
  // Mountain ring is all ore, no vents
  if (isMountainRing(col, row, seed, N)) return false;
  const terrain = classifyCellTerrain(col, row, seed, waterLevel, N);
  if (!VENT_TERRAIN.has(terrain)) return false;
  // Priority: tree > vent (forest blobs + mountain scatter)
  if (blockBlobZone(col, row, seed)) return false;
  if (mountainTreeScatter(col, row, seed, N)) return false;
  return ventZone(col, row, seed);
}

/**
 * Find the nearest plain-ground cell to the grid centre: lowland or plains terrain
 * that is NOT in a forest blob zone (i.e. renders f7/f8 tiles, the largest visible areas).
 * Spiral search from centre → first match returned.
 */
export function findPlainGroundCell(seed: number, N: number): { col: number; row: number } {
  const cx = Math.floor(N / 2);
  for (let r = 0; r < Math.ceil(N / 2); r++) {
    for (let dc = -r; dc <= r; dc++) {
      for (let dr = -r; dr <= r; dr++) {
        if (Math.abs(dc) !== r && Math.abs(dr) !== r) continue;  // shell only
        const col = cx + dc;
        const row = cx + dr;
        if (col < 0 || row < 0 || col >= N || row >= N) continue;
        const terrain = classifyCellTerrain(col, row, seed, 0, N);
        if ((terrain === 'lowland' || terrain === 'plains') && !blockBlobZone(col, row, seed)) {
          return { col, row };
        }
      }
    }
  }
  return { col: cx, row: cx };  // fallback
}

/**
 * Find the nearest plain-ground cell to the grid centre that is at least `minDist`
 * cells (Euclidean) away from (excludeCol, excludeRow).
 * Used to separate the colony hub from the mountain overlay.
 */
export function findPlainGroundCellFarFrom(
  seed: number,
  N: number,
  excludeCol: number,
  excludeRow: number,
  minDist: number = 12,
): { col: number; row: number } {
  const cx = Math.floor(N / 2);
  for (let r = 0; r < Math.ceil(N / 2); r++) {
    for (let dc = -r; dc <= r; dc++) {
      for (let dr = -r; dr <= r; dr++) {
        if (Math.abs(dc) !== r && Math.abs(dr) !== r) continue;
        const col = cx + dc;
        const row = cx + dr;
        if (col < 0 || row < 0 || col >= N || row >= N) continue;
        const dCol = col - excludeCol;
        const dRow = row - excludeRow;
        if (Math.sqrt(dCol * dCol + dRow * dRow) < minDist) continue;
        const terrain = classifyCellTerrain(col, row, seed, 0, N);
        if ((terrain === 'lowland' || terrain === 'plains') && !blockBlobZone(col, row, seed)) {
          return { col, row };
        }
      }
    }
  }
  return findPlainGroundCell(seed, N);  // fallback if minDist can't be satisfied
}

/**
 * Find a good starting land cell for first-time surface entry (no colony hub yet).
 * Requirements:
 *   - lowland or plains terrain (not forest/mountain)
 *   - at least 5×5 neighbours are also buildable land
 *   - resources (tree/ore/vent) exist within 12-cell radius
 * Uses actual waterLevel so water cells are correctly excluded.
 */
export function findStartingLandCell(
  seed: number,
  waterLevel: number,
  N: number,
): { col: number; row: number } {
  const cx = Math.floor(N / 2);

  for (let r = 0; r < Math.ceil(N / 2); r++) {
    for (let dc = -r; dc <= r; dc++) {
      for (let dr = -r; dr <= r; dr++) {
        if (Math.abs(dc) !== r && Math.abs(dr) !== r) continue; // shell only
        const col = cx + dc;
        const row = cx + dr;
        if (col < 2 || row < 2 || col >= N - 2 || row >= N - 2) continue;

        const terrain = classifyCellTerrain(col, row, seed, waterLevel, N);
        if (terrain !== 'lowland' && terrain !== 'plains') continue;
        if (blockBlobZone(col, row, seed)) continue;

        // Check 5×5 area is all buildable flat land (no mountains/peaks/water)
        let clearArea = true;
        for (let ddx = -2; ddx <= 2 && clearArea; ddx++) {
          for (let ddy = -2; ddy <= 2 && clearArea; ddy++) {
            const t = classifyCellTerrain(col + ddx, row + ddy, seed, waterLevel, N);
            if (t !== 'lowland' && t !== 'plains' && t !== 'hills') clearArea = false;
          }
        }
        if (!clearArea) continue;

        // Check for nearby resources within 12-cell radius
        let hasResource = false;
        for (let rdx = -12; rdx <= 12 && !hasResource; rdx++) {
          for (let rdy = -12; rdy <= 12 && !hasResource; rdy++) {
            const rc = col + rdx, rr = row + rdy;
            if (rc < 0 || rr < 0 || rc >= N || rr >= N) continue;
            if (rdx * rdx + rdy * rdy > 144) continue; // radius check
            if (isTreeCell(rc, rr, seed, N, waterLevel) ||
                isOreCell(rc, rr, seed, N, waterLevel) ||
                isVentCell(rc, rr, seed, N, waterLevel)) {
              hasResource = true;
            }
          }
        }
        if (!hasResource) continue;

        return { col, row };
      }
    }
  }

  // Fallback: use plain ground cell
  return findPlainGroundCell(seed, N);
}

/**
 * Find a cell suitable for a 7×7 (49-cell) mountain overlay (terrain === 'mountains' or 'peaks').
 * Requires the full 7×7 footprint to fit within the grid.
 * Returns null if no mountain cell exists.
 */
export function findMountainCell(seed: number, N: number): { col: number; row: number } | null {
  const cx = Math.floor(N / 2);
  for (let r = 0; r < Math.ceil(N / 2); r++) {
    for (let dc = -r; dc <= r; dc++) {
      for (let dr = -r; dr <= r; dr++) {
        if (Math.abs(dc) !== r && Math.abs(dr) !== r) continue;
        const col = cx + dc;
        const row = cx + dr;
        if (col < 0 || row < 0 || col + 6 >= N || row + 6 >= N) continue;
        const terrain = classifyCellTerrain(col, row, seed, 0, N);
        if (terrain === 'mountains' || terrain === 'peaks') return { col, row };
      }
    }
  }
  return null;
}

// Cached mountain position (avoids repeated spiral search per cell check)
let _mtPosCache: { seed: number; N: number; pos: { col: number; row: number } | null } | null = null;

function _getMountainPos(seed: number, N: number): { col: number; row: number } | null {
  if (_mtPosCache && _mtPosCache.seed === seed && _mtPosCache.N === N) return _mtPosCache.pos;
  const pos = findMountainCell(seed, N);
  _mtPosCache = { seed, N, pos };
  return pos;
}

/**
 * True if the cell falls within the mountain exclusion zone.
 * Uses a 9×9 area (7×7 voxel footprint + 1-cell border on each side) so that
 * ore/tree sprites on adjacent 'mountains' terrain cells don't poke through the base.
 */
export function isMountainFootprint(col: number, row: number, seed: number, N: number): boolean {
  const mt = _getMountainPos(seed, N);
  if (!mt) return false;
  return col >= mt.col - 1 && col <= mt.col + 7 && row >= mt.row - 1 && row <= mt.row + 7;
}

/**
 * True if the cell is in the 1-cell-wide ore ring just outside the 9×9 exclusion zone.
 * Ring = 11×11 area minus 9×9 interior = 40 border cells around the mountain.
 */
function isMountainRing(col: number, row: number, seed: number, N: number): boolean {
  const mt = _getMountainPos(seed, N);
  if (!mt) return false;
  // Must be inside the 11×11 outer area …
  if (col < mt.col - 2 || col > mt.col + 8 || row < mt.row - 2 || row > mt.row + 8) return false;
  // … but NOT inside the 9×9 exclusion zone
  if (col >= mt.col - 1 && col <= mt.col + 7 && row >= mt.row - 1 && row <= mt.row + 7) return false;
  return true;
}

/**
 * Deterministic per-cell check: ~55 % of mountain-ring cells are ore deposits.
 * Seed offset 9999 chosen to avoid collision with smoothElevation octaves.
 */
function mountainRingOre(col: number, row: number, seed: number): boolean {
  return cellHash(col, row, seed + 9191) < 0.55;
}

/**
 * Scattered individual trees near the mountain (outside exclusion zone).
 * Covers a 17×17 area (excl. zone + 4 cells around it); ~12 % chance per cell.
 * Creates organic tree scatter on mountain slopes even outside forest blobs.
 */
function mountainTreeScatter(col: number, row: number, seed: number, N: number): boolean {
  const mt = _getMountainPos(seed, N);
  if (!mt) return false;
  if (col < mt.col - 5 || col > mt.col + 11 || row < mt.row - 5 || row > mt.row + 11) return false;
  // Not inside exclusion zone (those are always grass)
  if (col >= mt.col - 1 && col <= mt.col + 7 && row >= mt.row - 1 && row <= mt.row + 7) return false;
  return cellHash(col, row, seed + 7654) < 0.12;
}

/**
 * Per-cell deterministic boolean (50/50).
 * Used by SurfaceScene to decide whether to horizontally mirror a land sprite.
 */
export function cellMirrorVariant(col: number, row: number, seed: number): boolean {
  const h = Math.sin(col * 73.137 + row * 127.431 + (seed + 9999) * 0.17) * 43758.5453;
  return (h - Math.floor(h)) > 0.5;
}

/**
 * @deprecated — use terrainToAtlasIndex() instead.
 * Kept for reference; no longer used by SurfaceScene.
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
 * Check if a building footprint (top-left gx,gy, size sW×sH) is within a
 * 1-cell orthogonal gap of any placed building footprint.
 *
 * "Adjacent" now means exactly 2 cells apart along one axis (with the
 * other axis overlapping), matching the 1-cell spacing rule enforced by
 * the placement gap check.  Diagonal proximity does NOT count.
 *
 * Uses interval arithmetic: O(numBuildings) per check.
 */
export function isAdjacentToCity(
  gx: number, gy: number, sW: number, sH: number,
  buildings: PlacedBuilding[],
): boolean {
  const ax1 = gx, ax2 = gx + sW - 1;
  const ay1 = gy, ay2 = gy + sH - 1;

  for (const b of buildings) {
    const bDef = BUILDING_DEFS[b.type];
    const bSW  = bDef?.sizeW ?? 1;
    const bSH  = bDef?.sizeH ?? 1;
    const bx1  = b.x, bx2 = b.x + bSW - 1;
    const by1  = b.y, by2 = b.y + bSH - 1;

    // Horizontal path (same X band): X ranges overlap AND Y ranges are exactly 2 apart
    // (1 empty cell between them — gap = 1)
    const xOverlap = Math.max(ax1, bx1) <= Math.min(ax2, bx2);
    if (xOverlap && (ay2 + 2 === by1 || by2 + 2 === ay1)) return true;

    // Vertical path (same Y band): Y ranges overlap AND X ranges are exactly 2 apart
    const yOverlap = Math.max(ay1, by1) <= Math.min(ay2, by2);
    if (yOverlap && (ax2 + 2 === bx1 || bx2 + 2 === ax1)) return true;
  }
  return false;
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
