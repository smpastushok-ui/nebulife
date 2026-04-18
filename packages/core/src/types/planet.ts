import type { OrbitalParameters } from './orbit.js';
import type { Atmosphere, PlanetZone } from '../chemistry/atmosphere.js';
import type { Hydrosphere } from '../chemistry/water.js';
import type { MagneticField, HabitabilityFactors } from '../biology/habitability.js';
import type { PlanetResources } from '../chemistry/minerals.js';
import type { LifeComplexity } from '../biology/life-probability.js';

export type PlanetType = 'rocky' | 'terrestrial' | 'gas-giant' | 'ice-giant' | 'dwarf';
/**
 * Surface playfield size — drives the hex-grid layout used for colony building.
 *  - 'orbital' → Jupiter / Saturn-style giants. No solid surface, player builds
 *    an orbital station above the cloud tops. Compact 8-cell layout (2+4+2).
 *  - 'small' → dwarf planets, asteroids, small moons. 16-cell diamond.
 *  - 'medium' → typical rocky / terrestrial. 30-cell diamond.
 *  - 'large' → super-Earths and big rocky/ice worlds. 51-cell diamond.
 */
export type PlanetSize = 'orbital' | 'small' | 'medium' | 'large';
export type MoonComposition = 'rocky' | 'icy' | 'metallic' | 'volcanic';

/**
 * Classify a planet into its colony grid size.
 *
 * Type takes priority over radius:
 *  - gas-giant / ice-giant → 'orbital' (no surface)
 *  - dwarf → 'small' (always tiny regardless of computed radius)
 *  - everything else → bucketed by radiusEarth
 *
 * For backwards compatibility, the function still accepts a bare number
 * (legacy code passed `getPlanetSize(planet.radiusEarth)`); in that case
 * gas-giant detection is skipped and only the radius bucket is used.
 */
export function getPlanetSize(planetOrRadius: number | { type: PlanetType; radiusEarth: number }): PlanetSize {
  if (typeof planetOrRadius === 'number') {
    return bucketByRadius(planetOrRadius);
  }
  const { type, radiusEarth } = planetOrRadius;
  if (type === 'gas-giant' || type === 'ice-giant') return 'orbital';
  if (type === 'dwarf') return 'small';
  return bucketByRadius(radiusEarth);
}

function bucketByRadius(radiusEarth: number): PlanetSize {
  if (radiusEarth < 0.7) return 'small';
  if (radiusEarth <= 1.5) return 'medium';
  return 'large';
}

export interface Moon {
  id: string;
  seed: number;
  name: string;
  massKg: number;
  radiusKm: number;
  densityGCm3: number;
  compositionType: MoonComposition;
  orbitalRadiusKm: number;
  orbitalPeriodDays: number;
  surfaceTempK: number;
  hasAtmosphere: boolean;
  tidallyLocked: boolean;
}

export interface Planet {
  id: string;
  seed: number;
  name: string;
  type: PlanetType;
  zone: PlanetZone;

  // Physical properties
  massEarth: number;
  radiusEarth: number;
  densityGCm3: number;
  surfaceGravityG: number;
  escapeVelocityKmS: number;

  // Orbital
  orbit: OrbitalParameters;

  // Thermal
  equilibriumTempK: number;
  surfaceTempK: number;
  albedo: number;

  // Composition
  atmosphere: Atmosphere | null;
  hydrosphere: Hydrosphere | null;
  magneticField: MagneticField;
  resources: PlanetResources;

  // Biology
  habitability: HabitabilityFactors;
  hasLife: boolean;
  lifeComplexity: LifeComplexity;

  // Moons
  moons: Moon[];

  // Game state
  isHomePlanet: boolean;
  isColonizable: boolean;
  terraformDifficulty: number;   // 0 = already habitable, 1 = extreme
}
