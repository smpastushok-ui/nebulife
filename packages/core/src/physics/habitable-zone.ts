/**
 * Habitable Zone calculation based on Kopparapu et al. (2013, 2014).
 * Valid for stellar temperatures: 2600K - 7200K.
 *
 * Four boundaries:
 * - Recent Venus (inner optimistic)
 * - Runaway Greenhouse (inner conservative)
 * - Maximum Greenhouse (outer conservative)
 * - Early Mars (outer optimistic)
 */

export type HZBoundary = 'recentVenus' | 'runawayGreenhouse' | 'maximumGreenhouse' | 'earlyMars';

interface HZCoefficients {
  SeffSun: number;
  a: number;
  b: number;
  c: number;
  d: number;
}

/** Kopparapu et al. (2014) coefficients for 1 Earth-mass planet */
const HZ_COEFFICIENTS: Record<HZBoundary, HZCoefficients> = {
  recentVenus:       { SeffSun: 1.766, a: 2.136e-4,  b: 2.533e-8,  c: -1.332e-11, d: -3.097e-15 },
  runawayGreenhouse: { SeffSun: 1.107, a: 1.332e-4,  b: 1.580e-8,  c: -8.308e-12, d: -1.931e-15 },
  maximumGreenhouse: { SeffSun: 0.356, a: 6.171e-5,  b: 1.689e-9,  c: -3.198e-12, d: -5.575e-16 },
  earlyMars:         { SeffSun: 0.320, a: 5.547e-5,  b: 1.526e-9,  c: -2.874e-12, d: -5.011e-16 },
};

/** Calculate effective stellar flux for a given boundary and temperature */
export function calculateSeff(tEffK: number, boundary: HZBoundary): number {
  const { SeffSun, a, b, c, d } = HZ_COEFFICIENTS[boundary];
  const tStar = tEffK - 5780; // Delta from Sun's temperature
  return SeffSun + a * tStar + b * tStar ** 2 + c * tStar ** 3 + d * tStar ** 4;
}

export interface HabitableZone {
  /** Recent Venus boundary (inner optimistic) in AU */
  innerOptimisticAU: number;
  /** Runaway Greenhouse boundary (inner conservative) in AU */
  innerConservativeAU: number;
  /** Maximum Greenhouse boundary (outer conservative) in AU */
  outerConservativeAU: number;
  /** Early Mars boundary (outer optimistic) in AU */
  outerOptimisticAU: number;
}

/**
 * Calculate habitable zone boundaries for a star.
 * Distance in AU: d = √(L_star / S_eff)
 *
 * @param luminositySolar - Star luminosity in solar luminosities
 * @param tEffK - Effective temperature in Kelvin
 */
export function habitableZoneAU(luminositySolar: number, tEffK: number): HabitableZone {
  // Clamp temperature to valid range
  const t = Math.max(2600, Math.min(7200, tEffK));

  return {
    innerOptimisticAU:   Math.sqrt(luminositySolar / calculateSeff(t, 'recentVenus')),
    innerConservativeAU: Math.sqrt(luminositySolar / calculateSeff(t, 'runawayGreenhouse')),
    outerConservativeAU: Math.sqrt(luminositySolar / calculateSeff(t, 'maximumGreenhouse')),
    outerOptimisticAU:   Math.sqrt(luminositySolar / calculateSeff(t, 'earlyMars')),
  };
}

/** Check if a given orbital distance falls within the habitable zone */
export function isInHabitableZone(distanceAU: number, hz: HabitableZone, conservative: boolean = true): boolean {
  if (conservative) {
    return distanceAU >= hz.innerConservativeAU && distanceAU <= hz.outerConservativeAU;
  }
  return distanceAU >= hz.innerOptimisticAU && distanceAU <= hz.outerOptimisticAU;
}
