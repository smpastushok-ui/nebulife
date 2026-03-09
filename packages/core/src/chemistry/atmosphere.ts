import { SeededRNG } from '../math/rng.js';
import { canRetainGas, MOLECULAR_MASS } from '../physics/radiation.js';
import { escapeVelocity } from '../physics/gravity.js';
import { EARTH_MASS, EARTH_RADIUS } from '../constants/physics.js';
import { EARTH_ATMOSPHERE, VENUS_ATMOSPHERE, MARS_ATMOSPHERE } from './elements.js';
import { normalize } from '../math/distributions.js';

export interface Atmosphere {
  surfacePressureAtm: number;
  composition: Record<string, number>;
  greenhouse: number;
  hasOzone: boolean;
}

export type PlanetZone = 'inner' | 'habitable' | 'outer' | 'far';

/**
 * Generate atmosphere based on planet mass, temperature, and zone.
 * Returns null if planet cannot retain an atmosphere.
 */
export function generateAtmosphere(
  rng: SeededRNG,
  massKg: number,
  radiusM: number,
  surfaceTempK: number,
  zone: PlanetZone,
  hasLife: boolean,
): Atmosphere | null {
  const vEsc = escapeVelocity(massKg, radiusM);
  const massEarth = massKg / EARTH_MASS;

  // Very small bodies can't hold atmosphere
  if (massEarth < 0.05) return null;

  // Check which gases the planet can retain
  const retainsN2 = canRetainGas(vEsc, surfaceTempK, MOLECULAR_MASS.N2);
  const retainsCO2 = canRetainGas(vEsc, surfaceTempK, MOLECULAR_MASS.CO2);
  const retainsO2 = canRetainGas(vEsc, surfaceTempK, MOLECULAR_MASS.O2);
  const retainsH2O = canRetainGas(vEsc, surfaceTempK, MOLECULAR_MASS.H2O);
  const retainsH2 = canRetainGas(vEsc, surfaceTempK, MOLECULAR_MASS.H2);

  // If can't even retain CO2, no significant atmosphere
  if (!retainsCO2) return null;

  let composition: Record<string, number>;
  let pressure: number;
  let greenhouse: number;
  let hasOzone = false;

  if (zone === 'inner') {
    // Hot inner planets: thick CO2 atmosphere (Venus-like)
    composition = { ...VENUS_ATMOSPHERE };
    pressure = rng.nextFloat(0.1, 90); // Venus is ~92 atm
    greenhouse = pressure > 10 ? rng.nextFloat(5, 15) : rng.nextFloat(1, 5);
  } else if (zone === 'habitable') {
    if (hasLife) {
      // Life produces O2, Earth-like
      composition = { ...EARTH_ATMOSPHERE };
      pressure = rng.nextFloat(0.5, 2.0);
      greenhouse = rng.nextFloat(0.7, 1.5);
      hasOzone = true;
    } else if (retainsN2 && retainsCO2) {
      // No life: CO2/N2 mix
      const co2Frac = rng.nextFloat(0.3, 0.95);
      composition = { CO2: co2Frac, N2: 1 - co2Frac };
      pressure = rng.nextFloat(0.01, 10);
      greenhouse = co2Frac * pressure * rng.nextFloat(1, 3);
    } else {
      // Thin CO2 atmosphere (Mars-like)
      composition = { ...MARS_ATMOSPHERE };
      pressure = rng.nextFloat(0.001, 0.05);
      greenhouse = rng.nextFloat(0, 0.1);
    }
  } else if (zone === 'outer') {
    if (retainsH2) {
      // Gas/ice giant atmosphere
      composition = { H2: rng.nextFloat(0.7, 0.9), He: rng.nextFloat(0.1, 0.25) };
      const remaining = 1 - composition.H2 - composition.He;
      composition.CH4 = remaining;
      pressure = 1; // "surface" pressure at 1-bar level
      greenhouse = 0; // no solid surface
    } else {
      composition = { N2: rng.nextFloat(0.5, 0.97), CH4: rng.nextFloat(0.01, 0.05) };
      const remaining = 1 - composition.N2 - composition.CH4;
      composition.Ar = remaining;
      pressure = rng.nextFloat(0.5, 2);
      greenhouse = rng.nextFloat(0.5, 2);
    }
  } else {
    // Far zone: very thin or no atmosphere
    if (massEarth > 0.1 && rng.nextBool(0.3)) {
      composition = { N2: rng.nextFloat(0.8, 0.98), CH4: rng.nextFloat(0.01, 0.05) };
      const remaining = 1 - composition.N2 - composition.CH4;
      composition.CO2 = remaining > 0 ? remaining : 0;
      pressure = rng.nextFloat(0.001, 0.01);
      greenhouse = 0;
    } else {
      return null;
    }
  }

  // Normalize composition
  const keys = Object.keys(composition);
  const values = keys.map(k => composition[k]);
  const normalized = normalize(values);
  const normalizedComp: Record<string, number> = {};
  keys.forEach((k, i) => {
    normalizedComp[k] = Math.round(normalized[i] * 10000) / 10000;
  });

  return {
    surfacePressureAtm: Math.round(pressure * 10000) / 10000,
    composition: normalizedComp,
    greenhouse: Math.round(greenhouse * 1000) / 1000,
    hasOzone,
  };
}
