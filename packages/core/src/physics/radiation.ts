import { STEFAN_BOLTZMANN, SOLAR_LUMINOSITY, SOLAR_RADIUS, BOLTZMANN_K } from '../constants/physics.js';

/** Stefan-Boltzmann Law: L = 4πR²σT⁴ (Watts) */
export function luminosityFromRadiusTemp(radiusM: number, tempK: number): number {
  return 4 * Math.PI * radiusM ** 2 * STEFAN_BOLTZMANN * tempK ** 4;
}

/** Luminosity in solar units from solar radius and temperature */
export function luminositySolar(radiusSolar: number, tempK: number): number {
  const radiusM = radiusSolar * SOLAR_RADIUS;
  return luminosityFromRadiusTemp(radiusM, tempK) / SOLAR_LUMINOSITY;
}

/**
 * Equilibrium temperature of a planet (no atmosphere):
 * T_eq = T★ · √(R★ / (2·a)) · (1 - A)^(1/4)
 */
export function equilibriumTemperature(
  starTempK: number,
  starRadiusM: number,
  orbitalDistanceM: number,
  albedo: number = 0.3,
): number {
  return starTempK * Math.sqrt(starRadiusM / (2 * orbitalDistanceM)) * Math.pow(1 - albedo, 0.25);
}

/**
 * Surface temperature with greenhouse effect.
 * Multiplicative model: T_s = T_eq * (1 + 0.13 * g)
 * - g=0 → no atmosphere (T_s = T_eq)
 * - g=1 → Earth-like (~+13% over T_eq, e.g. 255 → 288K)
 * - g=15 → Venus-like (~+195% over T_eq, e.g. 230 → 678K, real Venus ~735K)
 * Hard-clamped to prevent runaway: g capped at 25 internally.
 */
export function surfaceTemperatureWithGreenhouse(equilibriumTempK: number, greenhouseFactor: number): number {
  const g = Math.min(Math.max(greenhouseFactor, 0), 25);
  return equilibriumTempK * (1 + 0.13 * g);
}

/** Blackbody peak wavelength (Wien's law): λ_max = b / T (meters) */
export function peakWavelength(tempK: number): number {
  const WIEN_B = 2.897771955e-3; // Wien's displacement constant (m·K)
  return WIEN_B / tempK;
}

/**
 * Thermal velocity of a gas molecule: v_th = √(3·k·T / m)
 * Used to determine if a planet can retain its atmosphere.
 * molecularMassKg = mass of one molecule in kg
 */
export function thermalVelocity(tempK: number, molecularMassKg: number): number {
  return Math.sqrt(3 * BOLTZMANN_K * tempK / molecularMassKg);
}

/**
 * Can a planet retain a gas species?
 * Rule of thumb: escape velocity must be > 6× thermal velocity
 */
export function canRetainGas(escapeVelocityMs: number, tempK: number, molecularMassKg: number): boolean {
  const vTh = thermalVelocity(tempK, molecularMassKg);
  return escapeVelocityMs > 6 * vTh;
}

// Molecular masses (kg) for common atmospheric gases
export const MOLECULAR_MASS = {
  H2: 2 * 1.674e-27,     // Hydrogen
  He: 4 * 1.674e-27,     // Helium
  H2O: 18 * 1.674e-27,   // Water vapor
  N2: 28 * 1.674e-27,    // Nitrogen
  O2: 32 * 1.674e-27,    // Oxygen
  CO2: 44 * 1.674e-27,   // Carbon dioxide
  CH4: 16 * 1.674e-27,   // Methane
  NH3: 17 * 1.674e-27,   // Ammonia
} as const;
