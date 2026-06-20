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
//
// The galaxy spans ~600 LY (player home → galactic core). Linear distance→time
// at the old speeds made any cross-zone delivery take weeks-to-months, and even
// intra-zone hops (10-20 LY) took days. Endgame players (L48+) terraform/transport
// from their NEAREST colony with ships, so the relevant hop is usually small —
// but we compress with sqrt and hard-cap so even a far donor stays in HOURS.
//
//   flightHours(tier) = clamp(BASE_H[tier] × sqrt(distanceLY), MIN, CAP)
//
// Examples (tier 3): 13 LY → ~1.0h, 30 LY → ~1.5h, 170 LY → ~3.7h, 600 LY → cap 6h.

/** Per-tier flight-time coefficient (game-hours per √LY). Higher tier = faster. */
export const TF_FLIGHT_HOURS_PER_SQRT_LY: Record<1 | 2 | 3, number> = {
  1: 0.85,
  2: 0.62,
  3: 0.44,
};

/** Lower / upper bound on one-way flight time (game-hours). */
export const TF_FLIGHT_MIN_HOURS = 0.1;
export const TF_FLIGHT_MAX_HOURS = 12;

/**
 * Repair cost: minerals = ceil(tierMaxCargo × TF_REPAIR_K × √distanceLY).
 * Scales with hauler size and (compressed) distance so far hops cost more
 * without exploding at galaxy scale. tier-3 (cargo 5000): 13 LY → ~3.2k,
 * 50 LY → ~6.4k, 170 LY → ~11.7k, 600 LY → ~22k.
 */
export const TF_REPAIR_K = 0.18;
