// Hex size for rendering
export const HEX_RADIUS = 42;
export const HEX_W = Math.ceil(Math.sqrt(3) * HEX_RADIUS);
export const HEX_H = HEX_RADIUS * 2;

export type HexState = 'hidden' | 'locked' | 'resource' | 'empty' | 'building' | 'harvester';
export type ResourceType = 'tree' | 'ore' | 'vent' | 'water';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type HexPlanetSize = 'small' | 'medium' | 'large';

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
// Diamond layout — size 3 (30 hex, 3 zones) or size 4 (56 hex, 4 zones)
// ---------------------------------------------------------------------------

// Planet size → diamond size mapping
export function planetSizeToDiamond(size: HexPlanetSize): 3 | 4 {
  return size === 'large' ? 4 : 3;
}

// Backward compat defaults (medium = size 3)
export const DIAMOND_ROWS = [1, 2, 3, 4, 5, 5, 4, 3, 2, 1] as const;
export const CENTER_ROW = 4;
export const CENTER_COL = 2;

export function getDiamondConfig(size: HexPlanetSize = 'medium') {
  const d = planetSizeToDiamond(size);
  const rows = d === 3 ? 10 : 14;
  const maxWidth = d === 3 ? 5 : 7;
  const centerRow = d === 3 ? 4 : 6;
  const maxZone = d; // 3 zones or 4 zones
  return { diamondSize: d, rows, maxWidth, centerRow, maxZone };
}

// ---------------------------------------------------------------------------
// Diamond position generation (axial coordinate zone calculation)
// ---------------------------------------------------------------------------

/**
 * Generate diamond hex map using axial coordinates for zone calculation.
 * @param size 3 = 30 hex (3 zones), 4 = 56 hex (4 zones)
 */
export function getDiamondPositions(size: 3 | 4 = 3): HexPosition[] {
  const positions: HexPosition[] = [];
  const totalRows = size === 3 ? 10 : 14;
  const maxWidth = size === 3 ? 5 : 7;
  const centerRow = size === 3 ? 4 : 6;

  const zoneCounters: Record<number, number> = {};

  for (let row = 0; row < totalRows; row++) {
    const cols = row <= centerRow ? row + 1 : totalRows - row;
    if (cols > maxWidth) continue; // safety

    for (let col = 0; col < cols; col++) {
      // Axial coordinate zone calculation
      const q = col - Math.floor(cols / 2) - Math.floor((row - centerRow) / 2);
      const r = row - centerRow;
      const s = -q - r;
      const zone = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));

      // Pixel position — clean hex grid with gap
      const GAP = 6;
      const spW = HEX_W + GAP;
      const spH = HEX_H * 0.75 + GAP * 0.4;
      // Centre each row horizontally
      const xOffset = (maxWidth - cols) * 0.5 * spW;
      const x = xOffset + col * spW;
      const y = row * spH;

      const zOffset = Math.abs(row - centerRow) * 2;
      const index = (zoneCounters[zone] ?? 0);
      zoneCounters[zone] = index + 1;

      positions.push({
        id: `d${row}-${col}`,
        ring: zone,
        index,
        row,
        col,
        x,
        y,
        zOffset,
      });
    }
  }

  return positions;
}

/** Generate hex positions for a planet size (backward compat wrapper) */
export function getHexPositions(size: HexPlanetSize = 'medium'): HexPosition[] {
  return getDiamondPositions(planetSizeToDiamond(size));
}

/** Compute zone for a hex at (row, col) using axial coordinates */
export function computeZone(row: number, col: number, size: HexPlanetSize = 'medium'): number {
  const cfg = getDiamondConfig(size);
  const totalRows = cfg.rows;
  const cols = row <= cfg.centerRow ? row + 1 : totalRows - row;
  const q = col - Math.floor(cols / 2) - Math.floor((row - cfg.centerRow) / 2);
  const r = row - cfg.centerRow;
  const s = -q - r;
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
}

/** Get adjacent hex IDs for a given planet size */
export function getAdjacentIds(row: number, col: number, size: HexPlanetSize = 'medium'): string[] {
  const cfg = getDiamondConfig(size);
  const totalRows = cfg.rows;
  const neighbours: string[] = [];

  // All 6 hex directions (offset depends on row parity relative to center)
  const getRowCols = (r: number) => r <= cfg.centerRow ? r + 1 : totalRows - r;

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

    // Try both candidate columns
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

export function rollRarity(seed: number, slotId: string, zone: number = 1): Rarity {
  const h = Math.abs(Math.sin(seed * 0.1 + hashStr(slotId) * 0.01)) * 100;
  // Zone 4 (large planets): boosted epic/legendary chances
  if (zone >= 4) {
    if (h < 8) return 'legendary';    // 8% (vs 2%)
    if (h < 25) return 'epic';        // 17% (vs 8%)
    if (h < 50) return 'rare';        // 25% (vs 15%)
    if (h < 75) return 'uncommon';    // 25% (vs 25%)
    return 'common';                   // 25% (vs 50%)
  }
  if (h < 2) return 'legendary';
  if (h < 10) return 'epic';
  if (h < 25) return 'rare';
  if (h < 50) return 'uncommon';
  return 'common';
}

export function rarityYield(rarity: Rarity): number {
  switch (rarity) {
    case 'legendary': return 9 + Math.floor(Math.random() * 2);
    case 'epic':      return 7 + Math.floor(Math.random() * 2);
    case 'rare':      return 5 + Math.floor(Math.random() * 2);
    case 'uncommon':  return 3 + Math.floor(Math.random() * 2);
    default:          return 1 + Math.floor(Math.random() * 2);
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
  tree:  '#22c55e',
  ore:   '#a0845e',
  vent:  '#22d3ee',
  water: '#3b82f6',
};

// ---------------------------------------------------------------------------
// Zone unlock costs
// ---------------------------------------------------------------------------

/**
 * Progressive unlock cost for diamond zones.
 * Zone 1: isotopes only (6 steps)
 * Zone 2: minerals + volatiles (12 steps)
 * Zone 3: minerals + volatiles + water (11 steps)
 *
 * @param zone        — 1, 2, or 3
 * @param unlockOrder — how many slots in this zone have been unlocked already (0-based)
 */
export function getUnlockCost(
  zone: number,
  _unlockOrder: number = 0,
): { minerals: number; volatiles: number; isotopes: number; water?: number; researchData?: number } {
  // Flat price per zone (terrestrial planets)
  if (zone === 1) return { minerals: 0, volatiles: 0, isotopes: 5, researchData: 1 };
  if (zone === 2) return { minerals: 8, volatiles: 5, isotopes: 0, researchData: 2 };
  if (zone === 3) return { minerals: 30, volatiles: 20, isotopes: 0, water: 10, researchData: 5 };
  // Zone 4 (large planets only — most expensive, best rewards)
  return { minerals: 60, volatiles: 40, isotopes: 10, water: 20, researchData: 10 };
}

// ---------------------------------------------------------------------------
// Resource rolling with geographic bias
// ---------------------------------------------------------------------------

/**
 * Roll resource type for a diamond hex with geographic bias.
 * Top rows (0-2): +tree (isotopes)
 * Bottom rows (7-9): +ore (minerals)
 * Edge columns (first or last in row): +water
 * Center area: balanced / +vent
 */
export function rollResourceType(
  seed: number,
  slotId: string,
  row?: number,
  col?: number,
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

  if (r !== undefined && c !== undefined) {
    const rowWidth = DIAMOND_ROWS[r] ?? 1;
    const isEdgeCol = c === 0 || c === rowWidth - 1;
    const isTopArea = r <= 2;
    const isBottomArea = r >= 7;

    // Edge columns: strong water bias
    if (isEdgeCol) {
      if (h < 50) return 'water';
      if (h < 70) return 'vent';
      if (h < 85) return 'tree';
      return 'ore';
    }
    // Top rows: tree bias
    if (isTopArea) {
      if (h < 50) return 'tree';
      if (h < 70) return 'ore';
      if (h < 85) return 'vent';
      return 'water';
    }
    // Bottom rows: ore bias
    if (isBottomArea) {
      if (h < 50) return 'ore';
      if (h < 70) return 'tree';
      if (h < 85) return 'vent';
      return 'water';
    }
  }

  // Center / default: balanced with slight vent bias
  if (h < 30) return 'tree';
  if (h < 55) return 'ore';
  if (h < 80) return 'vent';
  return 'water';
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

// ---------------------------------------------------------------------------
// Respawn + harvest math
// ---------------------------------------------------------------------------

/** Respawn time per zone (ms) */
export const ZONE_RESPAWN_MS: Record<number, number> = {
  0: 600_000,      // zone 0 (hub area) — 10 min
  1: 600_000,      // zone 1 — 10 min
  2: 1_800_000,    // zone 2 — 30 min
  3: 7_200_000,    // zone 3 — 2 hours
  4: 14_400_000,   // zone 4 (large only) — 4 hours (rare/epic/legendary boost)
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
