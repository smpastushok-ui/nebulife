import { G, SOLAR_MASS, AU, SECONDS_PER_YEAR } from '../constants/physics.js';

/** Orbital period (seconds): T = 2π√(a³ / (G·(M+m))) */
export function orbitalPeriodSeconds(semiMajorAxisM: number, centralMassKg: number, orbitingMassKg: number = 0): number {
  return 2 * Math.PI * Math.sqrt(semiMajorAxisM ** 3 / (G * (centralMassKg + orbitingMassKg)));
}

/** Orbital period in years, given AU and solar masses */
export function orbitalPeriodYears(semiMajorAxisAU: number, centralMassSolar: number): number {
  const aMeters = semiMajorAxisAU * AU;
  const mKg = centralMassSolar * SOLAR_MASS;
  return orbitalPeriodSeconds(aMeters, mKg) / SECONDS_PER_YEAR;
}

/** Orbital period in days */
export function orbitalPeriodDays(semiMajorAxisAU: number, centralMassSolar: number): number {
  return orbitalPeriodYears(semiMajorAxisAU, centralMassSolar) * 365.25;
}

/** Circular orbital velocity: v = √(G·M / r) (m/s) */
export function circularOrbitalVelocity(radiusM: number, centralMassKg: number): number {
  return Math.sqrt(G * centralMassKg / radiusM);
}

/** Semi-major axis from period: a = (G·M·T² / (4π²))^(1/3) */
export function semiMajorAxisFromPeriod(periodSeconds: number, centralMassKg: number): number {
  return Math.cbrt(G * centralMassKg * periodSeconds ** 2 / (4 * Math.PI ** 2));
}

/** Mean angular velocity: n = 2π / T (rad/s) */
export function meanMotion(periodSeconds: number): number {
  return 2 * Math.PI / periodSeconds;
}

/**
 * Position on elliptical orbit at a given true anomaly (angle from periapsis).
 * Returns distance from focus: r = a(1-e²) / (1 + e·cos(θ))
 */
export function orbitalRadius(semiMajorAxisM: number, eccentricity: number, trueAnomalyRad: number): number {
  return semiMajorAxisM * (1 - eccentricity ** 2) / (1 + eccentricity * Math.cos(trueAnomalyRad));
}

/** Periapsis distance: r_p = a(1 - e) */
export function periapsisDistance(semiMajorAxisM: number, eccentricity: number): number {
  return semiMajorAxisM * (1 - eccentricity);
}

/** Apoapsis distance: r_a = a(1 + e) */
export function apoapsisDistance(semiMajorAxisM: number, eccentricity: number): number {
  return semiMajorAxisM * (1 + eccentricity);
}
