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
 * Calibrated so that an Earth-like rocky planet (1 M_Earth, inner zone) yields:
 *   minerals  ~50 000 U   (3.0e22 kg → ×1.667e-18)
 *   volatiles ~30 000 U   (2.5e21 kg → ×1.200e-17)
 *   isotopes  ~ 5 000 U   (1.2e18 kg → ×4.167e-15)
 */
export const STOCK_SCALE = {
  minerals:  50_000 / 3.0e22,
  volatiles: 30_000 / 2.5e21,
  isotopes:   5_000 / 1.2e18,
} as const;

/**
 * Water stock baseline for an Earth-like planet (waterCoverage=0.71, depth~3.7 km,
 * radius~1 R_earth).  We normalize to that reference so different planets scale
 * by (coverage × depth × radius²).
 *
 * Reference: 40 000 U = Earth-equivalent.
 * water_extractor produces 1 U/tick = 60 U/hr.
 * 5 × water_extractors → 300 U/hr → ~133 h to exhaust Earth-level stocks.
 */
const WATER_STOCK_EARTH_REFERENCE = 40_000;
const WATER_COVERAGE_REF   = 0.71;
const WATER_DEPTH_REF_KM   = 3.7;
const WATER_RADIUS_REF     = 1.0; // R_Earth

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
  //   - gas-giant:   0 (no solid surface, water is unreachable in deep core)
  //   - ice-giant:   small atmospheric collection only (≤ 15% of volatiles)
  //   - rocky/terrestrial/dwarf with hydrosphere: surface area × coverage × depth formula
  //   - rocky without hydrosphere: 0 (no water — habitability.water is a TARGET score, not a stock)
  let water = 0;

  if (planet.type === 'gas-giant') {
    water = 0;
  } else if (planet.type === 'ice-giant') {
    // Atmospheric water collection — much less than volatiles since most water
    // is locked deep in the mantle ice/ammonia layer
    water = Math.round(volatiles * 0.15);
  } else {
    // rocky / terrestrial / dwarf — only count actual hydrosphere water
    const hyd = planet.hydrosphere;
    if (hyd && hyd.waterCoverageFraction > 0) {
      const coverageRatio = hyd.waterCoverageFraction / WATER_COVERAGE_REF;
      const depthRatio    = (hyd.oceanDepthKm > 0 ? hyd.oceanDepthKm : 1) / WATER_DEPTH_REF_KM;
      const radiusRatio   = (planet.radiusEarth > 0 ? planet.radiusEarth : 1) / WATER_RADIUS_REF;
      water = Math.round(
        WATER_STOCK_EARTH_REFERENCE * coverageRatio * depthRatio * radiusRatio * radiusRatio,
      );
    }
    // No hydrosphere → no water stock (habitability.water is a future-state score, not current resource)
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
