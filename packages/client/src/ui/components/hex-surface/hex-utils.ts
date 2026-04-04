// Hex size for rendering
export const HEX_RADIUS = 38; // radius of hexagon in pixels (smaller = tighter grid)

export type HexState = 'hidden' | 'locked' | 'resource' | 'empty' | 'building' | 'harvester';
export type ResourceType = 'tree' | 'ore' | 'vent' | 'water';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface HexSlotData {
  id: string;           // "ring0-0", "ring1-0", etc.
  ring: 0 | 1 | 2;
  index: number;
  state: HexState;
  resourceType?: ResourceType;
  rarity?: Rarity;
  yieldPerHour?: number;
  maxCapacity?: number;       // max accumulated units (12h cap)
  lastHarvestedAt?: number;
  buildingType?: string;
  buildingLevel?: number;
  unlockCost?: { minerals: number; volatiles: number; isotopes: number };
}

export interface HexPosition {
  id: string;
  ring: number;
  index: number;
  q: number;  // axial q
  r: number;  // axial r
  x: number;  // pixel x
  y: number;  // pixel y
}

// ---------------------------------------------------------------------------
// Axial coordinate hex grid (flat-top) — correct math for hex ring layout
// ---------------------------------------------------------------------------

// Axial coords for all 19 hexes in ring 0 + ring 1 + ring 2
const AXIAL_COORDS: { ring: 0 | 1 | 2; q: number; r: number }[] = [
  // Ring 0: center
  { ring: 0, q: 0, r: 0 },
  // Ring 1: 6 neighbors
  { ring: 1, q: 1, r: 0 },
  { ring: 1, q: 1, r: -1 },
  { ring: 1, q: 0, r: -1 },
  { ring: 1, q: -1, r: 0 },
  { ring: 1, q: -1, r: 1 },
  { ring: 1, q: 0, r: 1 },
  // Ring 2: 12 outer ring
  { ring: 2, q: 2, r: 0 },
  { ring: 2, q: 2, r: -1 },
  { ring: 2, q: 2, r: -2 },
  { ring: 2, q: 1, r: -2 },
  { ring: 2, q: 0, r: -2 },
  { ring: 2, q: -1, r: -1 },
  { ring: 2, q: -2, r: 0 },
  { ring: 2, q: -2, r: 1 },
  { ring: 2, q: -2, r: 2 },
  { ring: 2, q: -1, r: 2 },
  { ring: 2, q: 0, r: 2 },
  { ring: 2, q: 1, r: 1 },
];

/** Convert axial (q, r) to pixel position for pointy-top hex */
function axialToPixel(q: number, r: number, size: number): { x: number; y: number } {
  // 1.15 spacing factor — adds gap between hexes so they don't touch
  const spacing = size * 1.15;
  const x = spacing * Math.sqrt(3) * (q + r / 2);
  const y = spacing * (3 / 2) * r;
  return { x, y };
}

/** Generate all 19 hex positions with correct axial→pixel math */
export function getHexPositions(): HexPosition[] {
  let ring1Idx = 0;
  let ring2Idx = 0;

  return AXIAL_COORDS.map((coord) => {
    const { x, y } = axialToPixel(coord.q, coord.r, HEX_RADIUS);
    const index = coord.ring === 0 ? 0 : coord.ring === 1 ? ring1Idx++ : ring2Idx++;
    const id = `ring${coord.ring}-${index}`;
    // Subtle chaotic offset for non-center hexes (±3px) — makes grid feel organic
    const jitterX = coord.ring === 0 ? 0 : Math.sin(coord.q * 7.3 + coord.r * 13.7) * 3;
    const jitterY = coord.ring === 0 ? 0 : Math.cos(coord.q * 11.1 + coord.r * 5.9) * 3;
    return { id, ring: coord.ring, index, q: coord.q, r: coord.r, x: x + jitterX, y: y + jitterY };
  });
}

/** SVG polygon points string for a pointy-top hexagon */
export function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (60 * i - 90) * Math.PI / 180; // pointy-top: start at -90° (top vertex)
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

/** CSS clip-path for a pointy-top hexagon */
export const HEX_CLIP_PATH = 'polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)';

// ---------------------------------------------------------------------------
// Rarity + resource generation (seeded, deterministic)
// ---------------------------------------------------------------------------

export function rollRarity(seed: number, slotId: string): Rarity {
  const h = Math.abs(Math.sin(seed * 0.1 + hashStr(slotId) * 0.01)) * 100;
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

/**
 * Progressive unlock cost. All locked hexes in a ring show the SAME cost —
 * the cost for the NEXT unlock (based on how many are already unlocked).
 * @param ring — 1 or 2
 * @param unlockOrder — how many slots in this ring have been unlocked already (0-based)
 */
export function getUnlockCost(
  ring: number,
  unlockOrder: number = 0,
): { minerals: number; volatiles: number; isotopes: number } {
  if (ring === 1) {
    const table = [
      { minerals: 0, volatiles: 0, isotopes: 5  },
      { minerals: 0, volatiles: 0, isotopes: 8  },
      { minerals: 0, volatiles: 0, isotopes: 12 },
      { minerals: 0, volatiles: 0, isotopes: 16 },
      { minerals: 0, volatiles: 0, isotopes: 21 },
      { minerals: 0, volatiles: 0, isotopes: 28 },
    ];
    return { ...table[Math.min(unlockOrder, table.length - 1)] };
  }
  const table = [
    { minerals: 8,  volatiles: 5,  isotopes: 0 },
    { minerals: 12, volatiles: 8,  isotopes: 0 },
    { minerals: 16, volatiles: 11, isotopes: 0 },
    { minerals: 22, volatiles: 14, isotopes: 0 },
    { minerals: 28, volatiles: 18, isotopes: 0 },
    { minerals: 35, volatiles: 22, isotopes: 0 },
    { minerals: 42, volatiles: 27, isotopes: 0 },
    { minerals: 50, volatiles: 32, isotopes: 0 },
    { minerals: 58, volatiles: 37, isotopes: 0 },
    { minerals: 68, volatiles: 43, isotopes: 0 },
    { minerals: 78, volatiles: 50, isotopes: 0 },
    { minerals: 90, volatiles: 57, isotopes: 0 },
  ];
  return { ...table[Math.min(unlockOrder, table.length - 1)] };
}

export function rollResourceType(seed: number, slotId: string): ResourceType {
  const h = Math.abs(Math.sin(seed * 0.3 + hashStr(slotId) * 0.07)) * 100;
  if (h < 35) return 'tree';
  if (h < 60) return 'ore';
  if (h < 85) return 'vent';
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

export const RESOURCE_RESPAWN_MS = 3_600_000; // 1 hour

/** Calculate how many units have accumulated since last harvest (capped at maxCapacity) */
export function getAccumulatedYield(
  lastHarvestedAt: number | undefined,
  yieldPerHour: number,
  maxCapacity: number,
): number {
  if (!lastHarvestedAt) return yieldPerHour; // first harvest = 1 hour worth
  const elapsedHours = (Date.now() - lastHarvestedAt) / RESOURCE_RESPAWN_MS;
  return Math.min(maxCapacity, Math.floor(elapsedHours * yieldPerHour));
}

/** Check if at least 1 unit has accumulated */
export function isResourceReady(lastHarvestedAt: number | undefined, yieldPerHour: number = 1): boolean {
  if (!lastHarvestedAt) return true;
  const elapsedMs = Date.now() - lastHarvestedAt;
  const msPerUnit = RESOURCE_RESPAWN_MS / yieldPerHour;
  return elapsedMs >= msPerUnit;
}

/** Time remaining until next unit (ms) */
export function respawnTimeRemaining(lastHarvestedAt: number, yieldPerHour: number = 1): number {
  const msPerUnit = RESOURCE_RESPAWN_MS / yieldPerHour;
  return Math.max(0, msPerUnit - (Date.now() - lastHarvestedAt));
}

// ---------------------------------------------------------------------------
// Ring adjacency (Ring 1 unlock → Ring 2 slots become visible)
// ---------------------------------------------------------------------------

/** When ring1 slot[i] is unlocked, these ring2 slot indices become 'locked' (visible) */
export function getAdjacentRing2Indices(ring1Index: number): number[] {
  return [ring1Index * 2, (ring1Index * 2 + 1) % 12];
}
