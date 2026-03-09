import { SeededRNG } from '../math/rng.js';
import { EARTH_MASS, EARTH_RADIUS, AU, SOLAR_RADIUS } from '../constants/physics.js';
import { EARTH_CRUST_COMPOSITION, EARTH_ATMOSPHERE } from '../chemistry/elements.js';
import { orbitalPeriodYears, orbitalPeriodDays } from '../physics/kepler.js';
import type { Planet } from '../types/planet.js';
import type { Star } from '../types/star.js';

/**
 * Generate the home planet — identical Earth-analog for all players.
 * Composition, atmosphere, water, life — all fixed.
 * Only orbital parameters differ (placed in star's habitable zone).
 */
export function generateHomePlanet(star: Star, systemSeed: number): Planet {
  const rng = new SeededRNG(systemSeed);

  // Place in the middle of the habitable zone
  const hzMid = (star.habitableZone.innerConservativeAU + star.habitableZone.outerConservativeAU) / 2;
  const orbitalDistanceAU = hzMid;

  return {
    id: `planet-home-${systemSeed}`,
    seed: systemSeed,
    name: 'Terra Nova',
    type: 'rocky',
    zone: 'habitable',

    // Fixed Earth-identical properties
    massEarth: 1.0,
    radiusEarth: 1.0,
    densityGCm3: 5.51,
    surfaceGravityG: 1.0,
    escapeVelocityKmS: 11.19,

    orbit: {
      semiMajorAxisAU: orbitalDistanceAU,
      eccentricity: 0.017,
      inclinationDeg: 0,
      longitudeOfAscendingNodeDeg: rng.nextFloat(0, 360),
      argumentOfPeriapsisDeg: rng.nextFloat(0, 360),
      meanAnomalyDeg: rng.nextFloat(0, 360),
      periodYears: orbitalPeriodYears(orbitalDistanceAU, star.massSolar),
      periodDays: orbitalPeriodDays(orbitalDistanceAU, star.massSolar),
    },

    equilibriumTempK: 255,
    surfaceTempK: 288,
    albedo: 0.30,

    atmosphere: {
      surfacePressureAtm: 1.0,
      composition: { ...EARTH_ATMOSPHERE },
      greenhouse: 1.0,
      hasOzone: true,
    },

    hydrosphere: {
      waterCoverageFraction: 0.71,
      oceanDepthKm: 3.7,
      iceCapFraction: 0.07,
      hasSubsurfaceOcean: false,
    },

    magneticField: {
      strengthT: 5e-5,
      hasMagnetosphere: true,
    },

    resources: {
      crustComposition: { ...EARTH_CRUST_COMPOSITION },
      deposits: [
        { element: 'Fe', abundanceRelative: 1.0, depth: 'shallow' },
        { element: 'Cu', abundanceRelative: 1.0, depth: 'shallow' },
        { element: 'Al', abundanceRelative: 1.0, depth: 'surface' },
        { element: 'Si', abundanceRelative: 1.0, depth: 'surface' },
        { element: 'Ti', abundanceRelative: 1.0, depth: 'deep' },
        { element: 'U', abundanceRelative: 0.3, depth: 'deep' },
        { element: 'Ni', abundanceRelative: 0.8, depth: 'deep' },
      ],
    },

    habitability: {
      temperature: 1.0,
      atmosphere: 1.0,
      water: 1.0,
      magneticField: 1.0,
      gravity: 1.0,
      overall: 1.0,
    },

    hasLife: true,
    lifeComplexity: 'intelligent',

    moons: [
      {
        id: `moon-home-${systemSeed}`,
        seed: systemSeed,
        name: 'Luna',
        massKg: 7.342e22,
        radiusKm: 1737.4,
        densityGCm3: 3.34,
        compositionType: 'rocky',
        orbitalRadiusKm: 384400,
        orbitalPeriodDays: 27.3,
        surfaceTempK: 200,
        hasAtmosphere: false,
        tidallyLocked: true,
      },
    ],

    isHomePlanet: true,
    isColonizable: false,  // About to be destroyed
    terraformDifficulty: 0,
  };
}
