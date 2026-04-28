// Hex size for rendering
export const HEX_RADIUS = 50;
export const HEX_W = Math.ceil(Math.sqrt(3) * HEX_RADIUS);
export const HEX_H = HEX_RADIUS * 2;

export type HexState = 'hidden' | 'locked' | 'resource' | 'empty' | 'building' | 'harvester';
/**
 * Surface hex resource types.
 *  - tree:       biological matter (plants, organic compounds) — requires life or high habitability
 *  - ore:        mineral deposits — available on any rocky surface
 *  - vent:       volcanic/gas vents — more common on hot/volcanic worlds
 *  - water:      liquid or frozen water — requires hydrosphere, ice caps, or subsurface ocean
 *  - crystal:    abiotic mineral crystals — found on cold/dead rocky worlds; yields isotopes
 *  - bio_fossil: preserved organic material on dead worlds; yields isotopes (trace biosignatures)
 *
 * crystal and bio_fossil are yielded as isotopes, same as tree, but appear on worlds without life.
 */
export type ResourceType = 'tree' | 'ore' | 'vent' | 'water' | 'crystal' | 'bio_fossil';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

/**
 * Minimal planet context passed to rollResourceType for planet-aware slot generation.
 * Uses optional fields for backward compatibility with existing planet objects
 * that may not have all properties.
 */
export interface PlanetContext {
  /** Planet type: 'rocky' | 'terrestrial' | 'gas-giant' | 'ice-giant' | 'dwarf' */
  type?: string;
  /** Whether the planet has confirmed life */
  hasLife?: boolean;
  /** Overall habitability 0-1 */
  habitabilityOverall?: number;
  /** Surface temperature in Kelvin */
  surfaceTempK?: number;
  /** Volcanic activity / geological activity 0-1 — derived from planet data if available */
  volcanism?: number;
  /** Hydrosphere data */
  waterCoverageFraction?: number;
  iceCapFraction?: number;
  hasSubsurfaceOcean?: boolean;
}

export type HexPlanetSize = 'orbital' | 'small' | 'medium' | 'large';

export interface HexSlotData {
  id: string;           // "d{row}-{col}" e.g. "d4-2" for hub. Old saves: "ring0-0" etc.
  ring: number;         // zone: 0=hub, 1..N (kept as 'ring' for save compat)
  index: number;        // index within the zone (0-based)
  state: HexState;
  resourceType?: ResourceType;
  rarity?: Rarity;
  yieldPerHour?: number;
  maxCapacity?: number;       // max accumulated units (12h cap)
  lastHarvestedAt?: number;
  buildingType?: string;
  buildingLevel?: number;
  unlockCost?: { minerals: number; volatiles: number; isotopes: number; water?: number; researchData?: number };
}

export interface HexPosition {
  id: string;
  ring: number;   // zone 0-3
  index: number;
  row: number;    // diamond row 0-9
  col: number;    // column within the row (0-based)
  x: number;      // pixel x (relative to grid centre)
  y: number;      // pixel y (relative to grid centre)
  zOffset: number; // visual depth offset (mountain effect)
}

// ---------------------------------------------------------------------------
// Planet layout — array of hex counts per row
// ---------------------------------------------------------------------------

export const PLANET_LAYOUTS: Record<HexPlanetSize, number[]> = {
  orbital: [2, 4, 2],
  small:   [1, 2, 3, 4, 3, 2, 1],
  medium:  [1, 2, 3, 4, 5, 5, 4, 3, 2, 1],
  large:   [1, 2, 3, 4, 5, 6, 6, 6, 5, 4, 3, 2, 1],
};

// Backward compat aliases (medium layout)
export const DIAMOND_ROWS = PLANET_LAYOUTS.medium as unknown as readonly number[];
export const CENTER_ROW = 4;
export const CENTER_COL = 2;

export function getDiamondConfig(size: HexPlanetSize = 'medium') {
  const widths = PLANET_LAYOUTS[size];
  const rows = widths.length;
  const maxWidth = Math.max(...widths);
  const centerRow = Math.floor(rows / 2);
  return { rows, maxWidth, centerRow };
}

// ---------------------------------------------------------------------------
// Position generation — pixel-to-axial zone calculation
// ---------------------------------------------------------------------------

/**
 * Generate hex positions using PLANET_LAYOUTS.
 * Zone is computed via pixel-to-axial coordinate conversion.
 */
export function getHexPositions(planetSize: HexPlanetSize = 'medium'): HexPosition[] {
  const widths = PLANET_LAYOUTS[planetSize];
  const rows = widths.length;
  const maxWidth = Math.max(...widths);

  const GAP_X = 12;
  const GAP_Y = 45;
  const EFF_W = HEX_W + GAP_X;
  const EFF_H = HEX_H * 0.75 + GAP_Y;

  // Mathematical center (no gaps) for axial conversion
  const mathCenterX = (maxWidth - 1) * 0.5 * HEX_W;
  const mathCenterY = (rows - 1) * 0.5 * (HEX_H * 0.75);

  const zoneCounters: Record<number, number> = {};
  const positions: HexPosition[] = [];

  for (let row = 0; row < rows; row++) {
    const cols = widths[row];
    for (let col = 0; col < cols; col++) {
      // Render position (with EFF gaps for building clearance)
      const x = (maxWidth - cols) * 0.5 * EFF_W + col * EFF_W;
      const y = row * EFF_H;

      // Math position (no gaps — for correct axial zone)
      const mathX = (maxWidth - cols) * 0.5 * HEX_W + col * HEX_W;
      const mathY = row * (HEX_H * 0.75);

      // Pixel → Axial
      const dx = mathX - mathCenterX;
      const dy = mathY - mathCenterY;
      const q = (Math.sqrt(3) / 3 * dx - 1 / 3 * dy) / HEX_RADIUS;
      const r = (2 / 3 * dy) / HEX_RADIUS;
      const axialQ = Math.round(q);
      const axialR = Math.round(r);
      const axialS = -axialQ - axialR;
      const zone = Math.max(Math.abs(axialQ), Math.abs(axialR), Math.abs(axialS));

      const index = zoneCounters[zone] ?? 0;
      zoneCounters[zone] = index + 1;

      positions.push({
        id: `d${row}-${col}`,
        ring: zone,
        index,
        row,
        col,
        x,
        y,
        zOffset: 0,
      });
    }
  }

  return positions;
}

/** Compute zone for a hex at (row, col) using pixel-to-axial conversion */
export function computeZone(row: number, col: number, size: HexPlanetSize = 'medium'): number {
  const widths = PLANET_LAYOUTS[size];
  const rows = widths.length;
  const maxWidth = Math.max(...widths);
  const mathCenterX = (maxWidth - 1) * 0.5 * HEX_W;
  const mathCenterY = (rows - 1) * 0.5 * (HEX_H * 0.75);
  const cols = widths[row] ?? 1;
  const mathX = (maxWidth - cols) * 0.5 * HEX_W + col * HEX_W;
  const mathY = row * (HEX_H * 0.75);
  const dx = mathX - mathCenterX;
  const dy = mathY - mathCenterY;
  const q = (Math.sqrt(3) / 3 * dx - 1 / 3 * dy) / HEX_RADIUS;
  const r = (2 / 3 * dy) / HEX_RADIUS;
  const axialQ = Math.round(q);
  const axialR = Math.round(r);
  const axialS = -axialQ - axialR;
  return Math.max(Math.abs(axialQ), Math.abs(axialR), Math.abs(axialS));
}

/** Get adjacent hex IDs for a given planet size */
export function getAdjacentIds(row: number, col: number, size: HexPlanetSize = 'medium'): string[] {
  const widths = PLANET_LAYOUTS[size];
  const totalRows = widths.length;
  const neighbours: string[] = [];

  const getRowCols = (r: number) => widths[r] ?? 0;
  const rowWidth = getRowCols(row);

  // Same row
  if (col > 0) neighbours.push(`d${row}-${col - 1}`);
  if (col < rowWidth - 1) neighbours.push(`d${row}-${col + 1}`);

  // Row above and below — project via x-fraction
  const xFrac = col - (rowWidth - 1) / 2;

  for (const targetRow of [row - 1, row + 1]) {
    if (targetRow < 0 || targetRow >= totalRows) continue;
    const tw = getRowCols(targetRow);
    if (tw <= 0) continue;

    for (const delta of [-0.25, 0.25]) {
      const c = Math.round(xFrac + delta + (tw - 1) / 2);
      if (c >= 0 && c < tw) {
        const id = `d${targetRow}-${c}`;
        if (!neighbours.includes(id)) neighbours.push(id);
      }
    }
  }

  return neighbours;
}

/** SVG polygon points string for a pointy-top hexagon */
export function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (60 * i - 90) * Math.PI / 180; // pointy-top: start at -90 deg (top vertex)
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

/** CSS clip-path for a pointy-top hexagon */
export const HEX_CLIP_PATH = 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)';

// ---------------------------------------------------------------------------
// Rarity + resource generation (seeded, deterministic)
// ---------------------------------------------------------------------------

/**
 * Roll rarity for a resource hex.
 *
 * Inner ring (zone 1) — basic odds, lower unique chance:
 *   legendary 10%, epic 15%, rare 20%, uncommon 25%, common 30%
 *
 * Outer ring (zone 2+) — double the unique (legendary) chance:
 *   legendary 30%, epic 20%, rare 20%, uncommon 15%, common 15%
 *
 * The 2x upgrade in legendary chance is the main balance lever that makes
 * outer hexes worth their 2x higher unlock cost despite having the same
 * 10-minute respawn timer as inner hexes.
 */
export function rollRarity(seed: number, slotId: string, zone: number = 1): Rarity {
  const h = Math.abs(Math.sin(seed * 0.1 + hashStr(slotId) * 0.01)) * 100;

  if (zone >= 2) {
    // Outer ring — high unique / legendary drop rate (30%)
    if (h < 30) return 'legendary';   // 30%
    if (h < 50) return 'epic';        // 20%
    if (h < 70) return 'rare';        // 20%
    if (h < 85) return 'uncommon';    // 15%
    return 'common';                   // 15%
  }

  // Inner ring (zone 0-1) — modest unique rate (10%)
  if (h < 10) return 'legendary';     // 10%
  if (h < 25) return 'epic';          // 15%
  if (h < 45) return 'rare';          // 20%
  if (h < 70) return 'uncommon';      // 25%
  return 'common';                     // 30%
}

/**
 * Compute yield per hour for a given rarity.
 *
 * Accepts an optional SeededRNG so the result is deterministic when the
 * caller passes a seeded instance.  Falls back to Math.random() for legacy
 * call-sites that have not yet been migrated (avoid breaking changes).
 *
 * v169: all primary call-sites in rollSlotContents pass a SeededRNG derived
 * from planet.seed × slotId hash, eliminating Math.random() from the core path.
 */
export function rarityYield(rarity: Rarity, rng?: { nextInt: (min: number, max: number) => number }): number {
  const roll = rng
    ? (min: number, max: number) => rng.nextInt(min, max)
    : (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

  switch (rarity) {
    case 'legendary': return roll(9, 10);
    case 'epic':      return roll(7, 8);
    case 'rare':      return roll(5, 6);
    case 'uncommon':  return roll(3, 4);
    default:          return roll(1, 2);
  }
}

/** Max capacity = 12 hours of yield */
export function rarityMaxCapacity(yieldPerHour: number): number {
  return yieldPerHour * 12;
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common:    '#94a3b8',
  uncommon:  '#44ff88',
  rare:      '#4488ff',
  epic:      '#aa66ff',
  legendary: '#ffcc44',
};

export const RESOURCE_COLORS: Record<ResourceType, string> = {
  tree:       '#22c55e',
  ore:        '#a0845e',
  vent:       '#22d3ee',
  water:      '#3b82f6',
  crystal:    '#a78bfa',  // violet — abiotic mineral crystals
  bio_fossil: '#d97706',  // amber — preserved organic traces
};

// ---------------------------------------------------------------------------
// Zone unlock costs
// ---------------------------------------------------------------------------

/**
 * Flat unlock cost per zone.
 * Zone 1 = inner ring (cheap — starter progression).
 * Zone 2+ = outer rings — 2x more expensive to unlock because they have
 * shorter respawn (same as inner, 10 min) but significantly better rarity
 * odds and higher yield per harvest.
 * Zones 5-8 are corner hexes on large/orbital planets — most expensive.
 */
export function getUnlockCost(
  zone: number,
  _unlockOrder: number = 0,
): { minerals: number; volatiles: number; isotopes: number; water?: number; researchData?: number } {
  if (zone === 0) return { minerals: 0,   volatiles: 0,   isotopes: 0                            };
  if (zone === 1) return { minerals: 0,   volatiles: 0,   isotopes: 10,  researchData: 1         };
  if (zone === 2) return { minerals: 30,  volatiles: 20,  isotopes: 0,   researchData: 4         }; // was 15/10/0/2
  if (zone === 3) return { minerals: 60,  volatiles: 40,  isotopes: 0,   water: 10, researchData: 10 }; // was 30/20/0/5/5
  if (zone === 4) return { minerals: 100, volatiles: 60,  isotopes: 0,   water: 20, researchData: 16 }; // was 50/30/0/10/8
  // Zones 5+ — corner hexes, hardest to reach
  return { minerals: 160, volatiles: 100, isotopes: 20, water: 40, researchData: 30 }; // was 80/50/10/20/15
}

// ---------------------------------------------------------------------------
// Resource rolling with geographic bias
// ---------------------------------------------------------------------------

/**
 * Roll resource type for a diamond hex with geographic AND planet-aware bias.
 *
 * Planet context rules (v169):
 *   water  — only if planet has liquid water (waterCoverageFraction > 0.05),
 *             or ice (iceCapFraction > 0.1), or a subsurface ocean.
 *             On dry worlds, water slots become 'ore' (or 'vent' on hot worlds).
 *   tree   — only if planet has life (hasLife === true) OR habitability >= 0.4.
 *             On dead worlds, tree slots become 'crystal' (cold/abiotic) or
 *             'bio_fossil' (evidence of past life, when surfaceTempK < 400).
 *   vent   — more common on hot/volcanic worlds (surfaceTempK > 400 or volcanism > 0.5).
 *   ore    — available on any rocky surface.
 *
 * Geographic bias is still applied for the base distribution, then planet rules
 * override specific type choices when they are physically impossible.
 *
 * Backward compat: if planetContext is omitted, behaviour is identical to pre-v169.
 */
export function rollResourceType(
  seed: number,
  slotId: string,
  row?: number,
  col?: number,
  size: HexPlanetSize = 'medium',
  planet?: PlanetContext,
): ResourceType {
  const h = Math.abs(Math.sin(seed * 0.3 + hashStr(slotId) * 0.07)) * 100;

  // Parse row/col from id if not provided
  let r = row;
  let c = col;
  if (r === undefined || c === undefined) {
    const m = slotId.match(/^d(\d+)-(\d+)$/);
    if (m) {
      r = parseInt(m[1], 10);
      c = parseInt(m[2], 10);
    }
  }

  // ── Planet-aware availability flags ──────────────────────────────────────
  // Defaults are permissive (true) so that missing context = old behaviour.
  const canHaveWater = planet
    ? ((planet.waterCoverageFraction ?? 0) > 0.05)
      || ((planet.iceCapFraction ?? 0) > 0.1)
      || (planet.hasSubsurfaceOcean === true)
    : true;

  const canHaveTree = planet
    ? (planet.hasLife === true) || ((planet.habitabilityOverall ?? 0) >= 0.4)
    : true;

  // Hot or volcanic worlds get more vents
  const ventBias = planet
    ? ((planet.surfaceTempK ?? 300) > 400 || (planet.volcanism ?? 0) > 0.5 ? 1.5 : 1.0)
    : 1.0;

  /**
   * Substitute type when a rolled type is not available on this planet.
   * Replacement rules are physically motivated:
   *   water unavailable  → ore (solid deposit instead of water)
   *   tree unavailable   → bio_fossil if tempK < 400 (preserved organics on dead world),
   *                        crystal otherwise (abiotic mineral formations)
   */
  const substitute = (type: ResourceType): ResourceType => {
    if (type === 'water' && !canHaveWater) {
      // Hot world: vent instead of dry ore
      return ((planet?.surfaceTempK ?? 300) > 400) ? 'vent' : 'ore';
    }
    if (type === 'tree' && !canHaveTree) {
      return ((planet?.surfaceTempK ?? 300) < 400) ? 'bio_fossil' : 'crystal';
    }
    return type;
  };

  // ── Geographic bias ───────────────────────────────────────────────────────

  if (r !== undefined && c !== undefined) {
    const widths = PLANET_LAYOUTS[size];
    const totalRows = widths.length;
    const rowWidth = widths[r] ?? 1;
    const isEdgeCol = c === 0 || c === rowWidth - 1;
    const isTopArea = r <= Math.floor(totalRows * 0.25);
    const isBottomArea = r >= Math.ceil(totalRows * 0.75);

    // Edge columns: strong water bias (coastal/ocean border)
    if (isEdgeCol) {
      if (h < 50) return substitute('water');
      if (h < 70 * ventBias / 1.0) return substitute('vent');
      if (h < 85) return substitute('tree');
      return 'ore';
    }
    // Top rows: tree bias (highlands, forest)
    if (isTopArea) {
      if (h < 50) return substitute('tree');
      if (h < 70) return 'ore';
      if (h < 85 * ventBias) return substitute('vent');
      return substitute('water');
    }
    // Bottom rows: ore bias (lowlands, mining)
    if (isBottomArea) {
      if (h < 50) return 'ore';
      if (h < 70) return substitute('tree');
      if (h < 85 * ventBias) return substitute('vent');
      return substitute('water');
    }
  }

  // Center / default: balanced with slight vent bias
  if (h < 30) return substitute('tree');
  if (h < 55) return 'ore';
  if (h < 80 * ventBias) return substitute('vent');
  return substitute('water');
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

// ---------------------------------------------------------------------------
// Respawn + harvest math
// ---------------------------------------------------------------------------

/**
 * Respawn time per zone (ms).
 * All zones share the same 10-minute cooldown — outer rings are differentiated
 * by higher unlock cost and better rarity odds, not by a longer wait time.
 */
export const ZONE_RESPAWN_MS: Record<number, number> = {
  0: 600_000,   // zone 0 (hub)     — 10 min
  1: 600_000,   // zone 1 (inner)   — 10 min
  2: 600_000,   // zone 2 (outer)   — 10 min
  3: 600_000,   // zone 3           — 10 min
  4: 600_000,   // zone 4           — 10 min
  5: 600_000,   // zone 5           — 10 min
  6: 600_000,   // zone 6           — 10 min
  7: 600_000,   // zone 7           — 10 min
  8: 600_000,   // zone 8 (corners) — 10 min
};
export const RESOURCE_RESPAWN_MS = 600_000; // legacy fallback

function zoneRespawnMs(zone?: number): number {
  return ZONE_RESPAWN_MS[zone ?? 1] ?? 600_000;
}

/** Calculate how many units have accumulated since last harvest (capped at maxCapacity) */
export function getAccumulatedYield(
  lastHarvestedAt: number | undefined,
  yieldPerHour: number,
  maxCapacity: number,
  zone?: number,
): number {
  if (!lastHarvestedAt) return yieldPerHour;
  const ms = zoneRespawnMs(zone);
  // Fixed respawn per zone — rarity doesn't affect timer, only yield amount
  const ready = (Date.now() - lastHarvestedAt) >= ms;
  return ready ? yieldPerHour : 0;
}

/** Check if respawn timer has elapsed (fixed per zone, independent of rarity) */
export function isResourceReady(lastHarvestedAt: number | undefined, _yieldPerHour: number = 1, zone?: number): boolean {
  if (!lastHarvestedAt) return true;
  return (Date.now() - lastHarvestedAt) >= zoneRespawnMs(zone);
}

/** Time remaining until respawn (fixed per zone) */
export function respawnTimeRemaining(lastHarvestedAt: number, _yieldPerHour: number = 1, zone?: number): number {
  return Math.max(0, zoneRespawnMs(zone) - (Date.now() - lastHarvestedAt));
}

// ---------------------------------------------------------------------------
// Legacy ring adjacency (kept for backward-compat references)
// ---------------------------------------------------------------------------

/** @deprecated Use getAdjacentIds() with diamond coordinates instead */
export function getAdjacentRing2Indices(ring1Index: number): number[] {
  return [ring1Index * 2, (ring1Index * 2 + 1) % 12];
}
