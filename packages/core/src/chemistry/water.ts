import { SeededRNG } from '../math/rng.js';
import type { Atmosphere, PlanetZone } from './atmosphere.js';

export interface Hydrosphere {
  waterCoverageFraction: number;   // 0.0 - 1.0 (Earth ~ 0.71)
  oceanDepthKm: number;
  iceCapFraction: number;          // 0.0 - 1.0
  hasSubsurfaceOcean: boolean;
}

/**
 * Generate hydrosphere based on temperature, atmosphere, and zone.
 * Liquid water requires: 273K < T < 373K and atmosphere pressure > 0.006 atm
 * (triple point of water is at 273.16K and 611.73 Pa ≈ 0.006 atm)
 */
export function generateHydrosphere(
  rng: SeededRNG,
  surfaceTempK: number,
  atmosphere: Atmosphere | null,
  zone: PlanetZone,
  massEarth: number,
): Hydrosphere | null {
  const pressure = atmosphere?.surfacePressureAtm ?? 0;

  // Check for liquid water conditions
  const hasLiquidWaterConditions =
    surfaceTempK >= 273 &&
    surfaceTempK <= 373 &&
    pressure >= 0.006;

  // Check for ice conditions
  const hasIceConditions = surfaceTempK < 273 && surfaceTempK > 50;

  // Subsurface ocean (like Europa): possible for icy moons/planets in outer zones
  const hasSubsurfaceOcean =
    (zone === 'outer' || zone === 'far') &&
    massEarth >= 0.005 &&
    rng.nextBool(0.25); // 25% chance

  if (!hasLiquidWaterConditions && !hasIceConditions && !hasSubsurfaceOcean) {
    return null;
  }

  if (hasLiquidWaterConditions) {
    // Temperature-dependent water coverage
    // Optimal at ~288K (Earth-like), less at extremes
    const tempFactor = 1 - Math.abs(surfaceTempK - 288) / 100;
    const baseCoverage = Math.max(0.05, Math.min(0.95, tempFactor * rng.nextFloat(0.3, 0.9)));

    // Ice caps: more at lower temps
    const iceFraction = surfaceTempK < 280
      ? rng.nextFloat(0.05, 0.3)
      : surfaceTempK < 300
        ? rng.nextFloat(0.01, 0.1)
        : 0;

    return {
      waterCoverageFraction: Math.round(baseCoverage * 1000) / 1000,
      oceanDepthKm: rng.nextFloat(0.5, 10),
      iceCapFraction: Math.round(iceFraction * 1000) / 1000,
      hasSubsurfaceOcean: false,
    };
  }

  if (hasIceConditions) {
    return {
      waterCoverageFraction: 0,
      oceanDepthKm: 0,
      iceCapFraction: rng.nextFloat(0.1, 1.0),
      hasSubsurfaceOcean,
    };
  }

  // Only subsurface ocean
  return {
    waterCoverageFraction: 0,
    oceanDepthKm: 0,
    iceCapFraction: rng.nextFloat(0.5, 1.0),
    hasSubsurfaceOcean: true,
  };
}
