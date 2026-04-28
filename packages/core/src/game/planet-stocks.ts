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

  const minerals  = Math.round(Math.max(0, rawMinerals  * STOCK_SCALE.minerals));
  const volatiles = Math.round(Math.max(0, rawVolatiles * STOCK_SCALE.volatiles));
  const isotopes  = Math.round(Math.max(0, rawIsotopes  * STOCK_SCALE.isotopes));

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

  const stocks: PlanetResourceStocks = {
    initial: { minerals, volatiles, isotopes, water },
    remaining: { minerals, volatiles, isotopes, water },
  };
  return stocks;
}

// ---------------------------------------------------------------------------
// Depletion helpers
// ---------------------------------------------------------------------------

type ResourceKey = 'minerals' | 'volatiles' | 'isotopes' | 'water';

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
