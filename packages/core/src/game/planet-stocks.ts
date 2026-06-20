// ---------------------------------------------------------------------------
// Planet resource stocks — finite per-planet extraction budget
// ---------------------------------------------------------------------------
//
// Units are the same abstract "U" used in colony storage (ColonyResources).
// STOCK_SCALE converts the astronomical kg values from chemistry/minerals.ts
// into game units so that a typical Earth-like planet has ~50 000 mineral units
// and a single mine (2 U/tick, 120 U/hr) takes ~83 hours to exhaust it.
//
// Water stocks are derived from hydrosphere coverage + depth rather than the
// element group totals (which only store dissolved minerals, not H2O mass).
// ---------------------------------------------------------------------------

import type { Planet } from '../types/planet.js';
import type { PlanetResourceStocks } from '../types/colony.js';
import { TF_BASE_COSTS, TF_SIZE_MULT, planetSizeBucket } from '../constants/terraform.js';

// ---------------------------------------------------------------------------
// Conversion constants
// ---------------------------------------------------------------------------

/**
 * Multiply raw kg values from PlanetResources.totalResources by these factors
 * to get abstract game units.
 *
 * Calibrated so that an Earth-like rocky planet (1 M_Earth, habitable zone)
 * yields the target game budgets:
 *   minerals  ~50 000 U   — raw ~5.80e22 kg (O now correctly counted as
 *                           mineral: bound oxygen in silicates is rock-forming
 *                           matter, not atmospheric gas)
 *   volatiles ~30 000 U   — raw ~1.88e21 kg (S, H, C, N, halogens; no O)
 *   isotopes  ~ 5 000 U   — raw ~3.17e15 kg with a large gameplay multiplier
 *                           (U/Th are ppb-level in crust; multiplier ensures
 *                           isotopes remain a playable resource, not 13 units)
 *
 * v169 recalibration: O moved from volatile → mineral group, so both scales
 * had to be recomputed.  Isotope scale increased ~379× for playability.
 */
export const STOCK_SCALE = {
  minerals:  50_000 / 5.80e22,   // was 50_000/3.0e22 (O was in volatiles)
  volatiles: 30_000 / 1.88e21,   // was 30_000/2.5e21 (was inflated by bound O)
  isotopes:   5_000 / 3.17e15,   // was 5_000/1.2e18 — large gameplay multiplier
} as const;

/**
 * Water stock baseline for an Earth-like planet (waterCoverage=0.71, depth~3.7 km,
 * radius~1 R_earth).  We normalize to that reference so different planets scale
 * by (coverage × depth × radius²).
 *
 * Reference: 40 000 U = Earth-equivalent.
 * water_extractor produces 1 U/tick = 60 U/hr.
 * 5 × water_extractors → 300 U/hr → ~133 h to exhaust Earth-level stocks.
 *
 * v169: also count frozen water (ice caps) and subsurface oceans.
 *   - Ice caps: treated as shallow liquid-equivalent at ICE_EQUIVALENT_DEPTH_KM.
 *   - Subsurface ocean (Europa-like): flat SUBSURFACE_OCEAN_BONUS units,
 *     representing a Europa-like internal ocean accessible via deep drill.
 */
const WATER_STOCK_EARTH_REFERENCE = 40_000;
const WATER_COVERAGE_REF    = 0.71;
const WATER_DEPTH_REF_KM    = 3.7;
const WATER_RADIUS_REF      = 1.0; // R_Earth

/**
 * Effective depth (km) used when computing ice-cap water stock.
 * Ice caps are shallower/less extractable than open ocean, so we use
 * a smaller equivalent depth compared to WATER_DEPTH_REF_KM.
 */
const ICE_EQUIVALENT_DEPTH_KM  = 10.0;  // km of ice/snow equivalent depth

/**
 * Flat water bonus for a confirmed subsurface ocean (Europa-style).
 * Represents a significant but inaccessible-by-surface-extractors deposit;
 * accessible only via deep_drill or future tech.
 */
const SUBSURFACE_OCEAN_BONUS = 15_000;  // U

type ResourceKey = 'minerals' | 'volatiles' | 'isotopes' | 'water';

const RESOURCE_KEYS: ResourceKey[] = ['minerals', 'volatiles', 'isotopes', 'water'];

/**
 * Terraform economy reserve:
 * A newly surveyed solid planet should usually contain more extractable value
 * than it costs to terraform, but not in a direct 1:1 refund shape. The average
 * uplift is ~+50%; per-planet and per-resource variance makes target selection
 * meaningful instead of "terraform everything".
 */
const TERRAFORM_STOCK_RETURN_TARGET = 1.5;
const TERRAFORM_RETURN_VARIANCE = 0.35; // 0.65x..1.35x around the 1.5x target
const TERRAFORM_RESOURCE_VARIANCE = 1.25;
const TERRAFORM_STOCK_SOFT_CAP = 1.0;

function seededUnit(seed: number, salt: string): number {
  let h = (Math.floor(seed) ^ 0x9e3779b9) >>> 0;
  for (let i = 0; i < salt.length; i++) {
    h = Math.imul(h ^ salt.charCodeAt(i), 0x85ebca6b) >>> 0;
    h ^= h >>> 13;
  }
  return (h >>> 0) / 0xffffffff;
}

function weightedTerraformCostEstimate(planet: Planet): Record<ResourceKey, number> {
  const sizeMult = TF_SIZE_MULT[planetSizeBucket(planet)];
  const difficultyMult = 1 + (planet.terraformDifficulty ?? 0);
  const habitability = planet.habitability;
  const progressByParam = {
    magneticField: Math.max(0, Math.min(100, habitability.magneticField * 100)),
    atmosphere: Math.max(0, Math.min(100, habitability.atmosphere * 100)),
    ozone: planet.atmosphere?.hasOzone === true ? 80 : 0,
    temperature: Math.max(0, Math.min(100, habitability.temperature * 100)),
    pressure: planet.atmosphere ? Math.max(0, Math.min(100, habitability.atmosphere * 100)) : 0,
    water: Math.max(0, Math.min(100, habitability.water * 100)),
  };

  const out: Record<ResourceKey, number> = { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
  for (const [paramId, costs] of Object.entries(TF_BASE_COSTS)) {
    const progress = progressByParam[paramId as keyof typeof progressByParam] ?? 0;
    const remaining = Math.max(0, Math.min(1, (100 - progress) / 100));
    const scale = sizeMult * difficultyMult * remaining;
    for (const [resource, amount] of Object.entries(costs)) {
      out[resource as ResourceKey] += amount * scale;
    }
  }
  return out;
}

function planetResourceBias(planet: Planet, key: ResourceKey): number {
  const hyd = planet.hydrosphere;
  const atmospherePressure = planet.atmosphere?.surfacePressureAtm ?? 0;
  const habitability = planet.habitability;

  switch (key) {
    case 'minerals':
      return planet.type === 'dwarf' ? 1.15 : planet.densityGCm3 >= 4.5 ? 1.25 : 1.0;
    case 'volatiles':
      return (atmospherePressure > 0.5 ? 1.25 : 0.9) * (planet.zone === 'outer' || planet.zone === 'far' ? 1.18 : 1.0);
    case 'isotopes':
      return planet.magneticField.hasMagnetosphere || habitability.magneticField > 0.5 ? 1.2 : 0.92;
    case 'water':
      return hyd && (hyd.waterCoverageFraction > 0 || hyd.iceCapFraction > 0 || hyd.hasSubsurfaceOcean)
        ? 1.35
        : 0.65;
  }
}

function applyTerraformEconomyFloor(
  planet: Planet,
  stocks: Record<ResourceKey, number>,
): Record<ResourceKey, number> {
  if (planet.isHomePlanet || planet.type === 'gas-giant' || planet.type === 'ice-giant') return stocks;
  if (planet.isColonizable || (planet.habitability?.overall ?? 0) >= 0.3) return stocks;

  const cost = weightedTerraformCostEstimate(planet);
  const totalCost = RESOURCE_KEYS.reduce((sum, key) => sum + cost[key], 0);
  if (totalCost <= 0) return stocks;

  const worldRoll = (1 - TERRAFORM_RETURN_VARIANCE) + seededUnit(planet.seed, 'tf-return') * (TERRAFORM_RETURN_VARIANCE * 2);
  const targetTotal = totalCost * TERRAFORM_STOCK_RETURN_TARGET * worldRoll;

  const weights = RESOURCE_KEYS.map((key) => {
    const costWeight = Math.max(0.08, cost[key] / totalCost);
    const naturalBias = planetResourceBias(planet, key);
    const resourceRoll = 0.45 + seededUnit(planet.seed, `tf-resource-${key}`) * TERRAFORM_RESOURCE_VARIANCE;
    return { key, weight: costWeight * naturalBias * resourceRoll };
  });
  const weightTotal = weights.reduce((sum, entry) => sum + entry.weight, 0);
  if (weightTotal <= 0) return stocks;

  const next = { ...stocks };
  for (const { key, weight } of weights) {
    const floor = Math.round(targetTotal * (weight / weightTotal));
    next[key] = Math.max(next[key], floor);
  }

  const totalAfterFloor = RESOURCE_KEYS.reduce((sum, key) => sum + next[key], 0);
  const softCap = targetTotal * TERRAFORM_STOCK_SOFT_CAP;
  if (totalAfterFloor > softCap && softCap > 0) {
    const scale = softCap / totalAfterFloor;
    for (const key of RESOURCE_KEYS) {
      next[key] = Math.max(0, Math.round(next[key] * scale));
    }
  }
  return next;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Deterministically generate planet-level finite stocks from the planet's
 * pre-computed `resources` and `hydrosphere` fields.
 *
 * All values are reproducible from the planet object alone (no extra RNG).
 */
export function generatePlanetStocks(planet: Planet): PlanetResourceStocks {
  const tr = planet.resources?.totalResources;

  // ── Minerals ─────────────────────────────────────────────────────────────
  const rawMinerals  = tr?.minerals  ?? 0;
  const rawVolatiles = tr?.volatiles ?? 0;
  const rawIsotopes  = tr?.isotopes  ?? 0;

  let minerals  = Math.round(Math.max(0, rawMinerals  * STOCK_SCALE.minerals));
  let volatiles = Math.round(Math.max(0, rawVolatiles * STOCK_SCALE.volatiles));
  let isotopes  = Math.round(Math.max(0, rawIsotopes  * STOCK_SCALE.isotopes));

  // ── Water ─────────────────────────────────────────────────────────────────
  // Water stock is REAL extractable water by physical type:
  //   - gas-giant:   0 (no solid surface; water unreachable in deep core)
  //   - ice-giant:   small atmospheric collection only (≤ 15% of volatiles)
  //   - rocky/terrestrial/dwarf: three possible contributions (any combination):
  //       1. Liquid hydrosphere (waterCoverageFraction > 0): area × depth × r²
  //       2. Ice caps (iceCapFraction > 0): ice treated as shallow equivalent
  //       3. Subsurface ocean (hasSubsurfaceOcean): flat bonus (Europa-like)
  //   - no hydrosphere at all → 0 (habitability.water is a target score, not stock)
  //
  // v169: frozen water (ice caps, subsurface) now contributes to water stock.
  let water = 0;

  if (planet.type === 'gas-giant') {
    water = 0;
  } else if (planet.type === 'ice-giant') {
    // Atmospheric water collection — much less than volatiles since most water
    // is locked deep in the mantle ice/ammonia layer.
    water = Math.round(volatiles * 0.15);
  } else {
    // rocky / terrestrial / dwarf
    const hyd = planet.hydrosphere;
    if (hyd) {
      const r = planet.radiusEarth > 0 ? planet.radiusEarth : 1;
      const radiusRatio = r / WATER_RADIUS_REF;

      // 1. Liquid hydrosphere contribution
      if (hyd.waterCoverageFraction > 0) {
        const coverageRatio = hyd.waterCoverageFraction / WATER_COVERAGE_REF;
        const depthRatio    = (hyd.oceanDepthKm > 0 ? hyd.oceanDepthKm : 1) / WATER_DEPTH_REF_KM;
        water += Math.round(
          WATER_STOCK_EARTH_REFERENCE * coverageRatio * depthRatio * radiusRatio * radiusRatio,
        );
      }

      // 2. Ice cap contribution (iceCapFraction > 0)
      // Treated as liquid-equivalent at ICE_EQUIVALENT_DEPTH_KM.
      // Ice is extractable via mining/melting; shallower per-unit than open ocean.
      if (hyd.iceCapFraction > 0) {
        const iceCoverageRatio = hyd.iceCapFraction / WATER_COVERAGE_REF;
        const iceDepthRatio    = ICE_EQUIVALENT_DEPTH_KM / WATER_DEPTH_REF_KM;
        water += Math.round(
          WATER_STOCK_EARTH_REFERENCE * iceCoverageRatio * iceDepthRatio * radiusRatio * radiusRatio,
        );
      }

      // 3. Subsurface ocean bonus (Europa-like)
      // Flat bonus representing an internal liquid ocean; not affected by surface radius
      // since it scales with internal structure rather than surface area.
      if (hyd.hasSubsurfaceOcean) {
        water += SUBSURFACE_OCEAN_BONUS;
      }
    }
    // No hydrosphere at all → water stays 0
  }

  const balanced = applyTerraformEconomyFloor(planet, { minerals, volatiles, isotopes, water });
  minerals = balanced.minerals;
  volatiles = balanced.volatiles;
  isotopes = balanced.isotopes;
  water = balanced.water;

  const stocks: PlanetResourceStocks = {
    initial: { minerals, volatiles, isotopes, water },
    remaining: { minerals, volatiles, isotopes, water },
  };
  return stocks;
}

// ---------------------------------------------------------------------------
// Depletion helpers
// ---------------------------------------------------------------------------

/**
 * Deplete a stock for one tick of extraction.
 *
 * Returns:
 *  - `newStocks`       — updated remaining values
 *  - `actualExtracted` — how much was actually produced (0 if depleted)
 *
 * Efficiency is 1.0 when above the depletion threshold (10% of initial),
 * linearly declining to 0.0 as remaining → 0.
 */
export function depleteStock(
  stocks: PlanetResourceStocks,
  resource: ResourceKey,
  requestedAmount: number,
): { newStocks: PlanetResourceStocks; actualExtracted: number } {
  const remaining = stocks.remaining[resource];
  const initial   = stocks.initial[resource];

  if (remaining <= 0 || requestedAmount <= 0) {
    return { newStocks: stocks, actualExtracted: 0 };
  }

  const efficiency = getDepletionEfficiency(remaining, initial);
  const actualExtracted = requestedAmount * efficiency;

  // Deduct from remaining (cap at 0)
  const newRemaining = Math.max(0, remaining - actualExtracted);

  const newStocks: PlanetResourceStocks = {
    initial: stocks.initial,
    remaining: {
      ...stocks.remaining,
      [resource]: newRemaining,
    },
  };

  return { newStocks, actualExtracted };
}

/**
 * Compute extraction efficiency given current remaining vs initial stock.
 *
 * Returns:
 *  - 1.0  when remaining >= 10% of initial
 *  - linear 1.0 → 0.0  when remaining is between 0 and 10%
 *  - 0.0  when remaining is 0
 */
export function getDepletionEfficiency(remaining: number, initial: number): number {
  if (initial <= 0) return 0;
  const threshold = initial * 0.10;
  if (remaining >= threshold) return 1.0;
  if (remaining <= 0) return 0;
  return remaining / threshold;
}

// ---------------------------------------------------------------------------
// Level-based backwards-compat depletion
// ---------------------------------------------------------------------------

/**
 * Apply a level-based depletion estimate to fresh stocks for existing players
 * who are starting without tracked stocks for the first time.
 *
 * Level thresholds and depletion fractions (from V168 plan §2.6):
 *   L1-5: 0%,  L10: 5%,  L20: 15%,  L35: 30%,  L50: 50%
 */
export function applyLevelDepletion(
  stocks: PlanetResourceStocks,
  playerLevel: number,
): PlanetResourceStocks {
  let depletionFraction = 0;
  if (playerLevel >= 50) depletionFraction = 0.50;
  else if (playerLevel >= 35) depletionFraction = 0.30;
  else if (playerLevel >= 20) depletionFraction = 0.15;
  else if (playerLevel >= 10) depletionFraction = 0.05;
  else depletionFraction = 0;

  if (depletionFraction === 0) return stocks;

  const keys: ResourceKey[] = ['minerals', 'volatiles', 'isotopes', 'water'];
  const newRemaining = { ...stocks.remaining };
  for (const key of keys) {
    newRemaining[key] = Math.round(stocks.initial[key] * (1 - depletionFraction));
  }
  return { initial: stocks.initial, remaining: newRemaining };
}
