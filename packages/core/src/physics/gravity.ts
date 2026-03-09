import { G } from '../constants/physics.js';

/** Surface gravity: g = G·M / r² (m/s²) */
export function surfaceGravity(massKg: number, radiusM: number): number {
  return G * massKg / (radiusM ** 2);
}

/** Surface gravity in Earth g units */
export function surfaceGravityG(massKg: number, radiusM: number): number {
  return surfaceGravity(massKg, radiusM) / 9.807;
}

/** Escape velocity: v = √(2·G·M / r) (m/s) */
export function escapeVelocity(massKg: number, radiusM: number): number {
  return Math.sqrt(2 * G * massKg / radiusM);
}

/** Gravitational force between two bodies: F = G·m1·m2 / r² (N) */
export function gravitationalForce(mass1Kg: number, mass2Kg: number, distanceM: number): number {
  return G * mass1Kg * mass2Kg / (distanceM ** 2);
}

/** Roche limit (rigid body): d = R·(2·ρM/ρm)^(1/3) */
export function rocheLimit(primaryRadiusM: number, primaryDensity: number, secondaryDensity: number): number {
  return primaryRadiusM * Math.cbrt(2 * primaryDensity / secondaryDensity);
}

/** Hill sphere radius: r_H = a·(m/3M)^(1/3) */
export function hillSphereRadius(semiMajorAxisM: number, bodyMassKg: number, centralMassKg: number): number {
  return semiMajorAxisM * Math.cbrt(bodyMassKg / (3 * centralMassKg));
}
