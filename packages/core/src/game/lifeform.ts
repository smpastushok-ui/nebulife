import { SeededRNG } from '../math/rng.js';
import type { DiscoveryRarity } from './discovery.js';

// ---------------------------------------------------------------------------
// Lifeform Genesis module — shared constants & helpers (client + server)
// ---------------------------------------------------------------------------

export type LifeformSource = 'found' | 'created';
export type LifeformMediaStatus = 'generating' | 'succeed' | 'failed';

/**
 * Alpha-photo cost in quarks per rarity (Kling v3 omni, up to 4K).
 * `common` lifeforms ship in the bundle and are free (cost 0).
 */
export const LIFEFORM_PHOTO_COST: Record<DiscoveryRarity, number> = {
  common: 0,
  uncommon: 30,
  rare: 45,
  epic: 60,
  legendary: 80,
};

/**
 * Alpha-video cost in quarks per rarity (image-to-video from the Alpha-photo).
 * Roughly +50% over the photo. `common` is free (bundled clip).
 */
export const LIFEFORM_VIDEO_COST: Record<DiscoveryRarity, number> = {
  common: 0,
  uncommon: 45,
  rare: 65,
  epic: 90,
  legendary: 120,
};

/**
 * Rarity weights for life *found* on building placement.
 * Heavily skewed to common (free, bundled) so paid generations feel special.
 */
export const LIFEFORM_FIND_WEIGHTS: Record<DiscoveryRarity, number> = {
  common: 70,
  uncommon: 18,
  rare: 7,
  epic: 3,
  legendary: 2,
};

/**
 * Buildings that can surface a lifeform when placed, with per-build chance.
 * `greenhouse` is the guaranteed "first contact" (handled separately, common).
 */
export const LIFEFORM_TRIGGER_BUILDINGS: Record<string, number> = {
  residential_dome: 0.06,
  biome_dome: 0.10,
  research_lab: 0.08,
  observatory: 0.07,
};

/** True if a building type can ever surface a (non-first-contact) lifeform. */
export function isLifeformTriggerBuilding(buildingType: string): boolean {
  return Object.prototype.hasOwnProperty.call(LIFEFORM_TRIGGER_BUILDINGS, buildingType);
}

export interface LifeformFindRoll {
  found: boolean;
  rarity: DiscoveryRarity;
}

/**
 * Seeded roll for finding a lifeform when a building is placed.
 * Deterministic: same (seed, buildingType, buildCount) → same result.
 *
 * @param seed          A stable seed (e.g. planet.seed).
 * @param buildingType  The placed building type.
 * @param buildCount    A monotonically-increasing counter to vary rolls.
 */
export function rollLifeformFind(
  seed: number,
  buildingType: string,
  buildCount: number,
): LifeformFindRoll {
  const chance = LIFEFORM_TRIGGER_BUILDINGS[buildingType] ?? 0;
  if (chance <= 0) return { found: false, rarity: 'common' };

  // Mix inputs into a single integer seed.
  const mixed = (Math.floor(seed) ^ hashString(buildingType) ^ (buildCount * 2654435761)) >>> 0;
  const rng = new SeededRNG(mixed);

  if (rng.next() > chance) return { found: false, rarity: 'common' };

  // Roll rarity using weights.
  const total = Object.values(LIFEFORM_FIND_WEIGHTS).reduce((a, b) => a + b, 0);
  const roll = rng.next() * total;
  let cumulative = 0;
  let rarity: DiscoveryRarity = 'common';
  for (const [r, w] of Object.entries(LIFEFORM_FIND_WEIGHTS) as [DiscoveryRarity, number][]) {
    cumulative += w;
    if (roll < cumulative) {
      rarity = r;
      break;
    }
  }

  return { found: true, rarity };
}

// ---------------------------------------------------------------------------
// Phase 2 — Genesis Lab ingredients (organic byproducts of surface harvesting)
// ---------------------------------------------------------------------------

export type LifeformIngredientId =
  | 'amino_precipitate'
  | 'lipid_vesicles'
  | 'nucleotide_matrix'
  | 'chiral_catalyst';

export const LIFEFORM_INGREDIENT_IDS: LifeformIngredientId[] = [
  'amino_precipitate',
  'lipid_vesicles',
  'nucleotide_matrix',
  'chiral_catalyst',
];

/** True if an ingredient is the rare catalyst (gates higher-rarity creation). */
export function isRareIngredient(id: LifeformIngredientId): boolean {
  return id === 'chiral_catalyst';
}

/**
 * Deposit type → ingredient mapping.
 *   tree  → amino_precipitate  (proteins)
 *   vent  → lipid_vesicles     (membranes)
 *   water → nucleotide_matrix  (RNA/DNA)
 *   ore   → chiral_catalyst    (rare catalyst)
 */
export const INGREDIENT_BY_DEPOSIT: Record<'tree' | 'ore' | 'vent' | 'water', LifeformIngredientId> = {
  tree: 'amino_precipitate',
  vent: 'lipid_vesicles',
  water: 'nucleotide_matrix',
  ore: 'chiral_catalyst',
};

/** Genesis ingredients unlock at this level (Ковчег Генезису). */
export const GENESIS_INGREDIENT_MIN_LEVEL = 48;

export interface LifeformCreateRecipe {
  ingredients: Partial<Record<LifeformIngredientId, number>>;
  quarks: number;
}

/**
 * Genesis Lab recipes per target rarity.
 * common = free (ingredients only); rarer = more ingredients + quarks.
 * Epic/legendary additionally require the rare chiral catalyst.
 */
export const LIFEFORM_CREATE_RECIPE: Record<DiscoveryRarity, LifeformCreateRecipe> = {
  common: {
    ingredients: { amino_precipitate: 1, lipid_vesicles: 1 },
    quarks: 0,
  },
  uncommon: {
    ingredients: { amino_precipitate: 2, lipid_vesicles: 1, nucleotide_matrix: 1 },
    quarks: 40,
  },
  rare: {
    ingredients: { amino_precipitate: 2, lipid_vesicles: 2, nucleotide_matrix: 2 },
    quarks: 70,
  },
  epic: {
    ingredients: { amino_precipitate: 3, lipid_vesicles: 2, nucleotide_matrix: 2, chiral_catalyst: 1 },
    quarks: 110,
  },
  legendary: {
    ingredients: { amino_precipitate: 3, lipid_vesicles: 3, nucleotide_matrix: 3, chiral_catalyst: 2 },
    quarks: 160,
  },
};

/** True if the player has enough ingredients for the given rarity recipe. */
export function canCreateLifeform(
  inventory: Record<string, number>,
  rarity: DiscoveryRarity,
): boolean {
  const recipe = LIFEFORM_CREATE_RECIPE[rarity];
  for (const [ing, need] of Object.entries(recipe.ingredients)) {
    if ((inventory[ing] ?? 0) < (need ?? 0)) return false;
  }
  return true;
}

/**
 * Seeded roll for a rare organic ingredient drop on a surface harvest.
 * Active only from L48. The rare catalyst (from ore) drops far less often.
 * Deterministic: same (seed, depositType, harvestCount) → same result.
 *
 * @returns the dropped ingredient id, or null for a normal harvest.
 */
export function rollIngredientDrop(
  seed: number,
  depositType: 'tree' | 'ore' | 'vent' | 'water',
  harvestCount: number,
  playerLevel: number,
): LifeformIngredientId | null {
  if (playerLevel < GENESIS_INGREDIENT_MIN_LEVEL) return null;

  const ingredient = INGREDIENT_BY_DEPOSIT[depositType];
  // Catalyst is rare (~2%), base organics ~7%.
  const chance = ingredient === 'chiral_catalyst' ? 0.02 : 0.07;

  const mixed = (Math.floor(seed) ^ hashString(depositType) ^ (harvestCount * 2654435761)) >>> 0;
  const rng = new SeededRNG(mixed);
  if (rng.next() > chance) return null;
  return ingredient;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
