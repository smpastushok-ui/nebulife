import type { OrbitalParameters } from './orbit.js';
import type { Atmosphere, PlanetZone } from '../chemistry/atmosphere.js';
import type { Hydrosphere } from '../chemistry/water.js';
import type { MagneticField, HabitabilityFactors } from '../biology/habitability.js';
import type { PlanetResources } from '../chemistry/minerals.js';
import type { LifeComplexity } from '../biology/life-probability.js';

export type PlanetType = 'rocky' | 'terrestrial' | 'gas-giant' | 'ice-giant' | 'dwarf';
export type PlanetSize = 'small' | 'medium' | 'large';
export type MoonComposition = 'rocky' | 'icy' | 'metallic' | 'volcanic';

/** Classify planet into size category based on radius. */
export function getPlanetSize(radiusEarth: number): PlanetSize {
  if (radiusEarth < 0.5) return 'small';
  if (radiusEarth <= 1.25) return 'medium';
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
