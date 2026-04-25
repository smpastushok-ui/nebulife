// ---------------------------------------------------------------------------
// Terraforming — balance constants
// ---------------------------------------------------------------------------

import type { TerraformParamId, ResourceCost } from '../types/terraform.js';
import type { Planet } from '../types/planet.js';

// ── Cost table ─────────────────────────────────────────────────────────────
//
// Represents the total resource cost to bring a parameter from 0% → 100%
// on a medium-sized planet at baseline difficulty (terraformDifficulty = 0).
// The `computeParamRequirement` function in terraform-rules.ts scales these
// by size, difficulty, and remaining progress fraction.

export const TF_BASE_COSTS: Record<TerraformParamId, ResourceCost> = {
  magneticField: { isotopes: 5000 },
  atmosphere:    { volatiles: 8000, isotopes: 500 },
  ozone:         { volatiles: 2000 },
  temperature:   { minerals: 4000 },
  pressure:      { volatiles: 3000 },
  water:         { water: 10000 },
};

// ── Planet size bucketing ───────────────────────────────────────────────────
//
// The game's existing `getPlanetSize()` returns 'orbital'|'small'|'medium'|'large'.
// Terraforming uses only a 3-bucket scale.  'orbital' planets are not
// terraformable (gas/ice giants), so they never reach this helper.
// 'small' covers dwarf planets (radiusEarth < 0.7 per getPlanetSize).

export type TerraformSizeBucket = 'small' | 'medium' | 'large';

export const TF_SIZE_MULT: Record<TerraformSizeBucket, number> = {
  small:  0.6,
  medium: 1.0,
  large:  1.5,
};

/**
 * Map a planet's radiusEarth onto the 3-bucket terraforming size scale.
 * Uses 0.5 / 1.5 cutoffs as specified in the plan (slightly tighter than
 * the colony-grid buckets in getPlanetSize, which uses 0.7 / 1.5).
 */
export function planetSizeBucket(planet: Planet): TerraformSizeBucket {
  if (planet.radiusEarth < 0.5) return 'small';
  if (planet.radiusEarth < 1.5) return 'medium';
  return 'large';
}

// ── Completion threshold ────────────────────────────────────────────────────

/** Overall progress percentage required to trigger planet transformation. */
export const TF_COMPLETION_THRESHOLD = 95;

/** Maximum habitability bonus applied on terraforming completion. */
export const TF_TARGET_HABITABILITY_BOOST = 0.4;

// ── Fleet constants ─────────────────────────────────────────────────────────

/**
 * Repair cost multiplier: minerals = distance × tierMaxCargo × TF_REPAIR_BASE_MULT.
 * A round trip of 10 LY with a tier-2 ship (cargo 1000) costs
 * ceil(10 × 1000 × 0.05) = 500 minerals.
 */
export const TF_REPAIR_BASE_MULT = 0.05;
