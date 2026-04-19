import { SeededRNG } from '../math/rng.js';
import { EARTH_MASS, EARTH_RADIUS, AU, SOLAR_RADIUS } from '../constants/physics.js';
import { EARTH_CRUST_COMPOSITION, EARTH_ATMOSPHERE, ROCKY_PLANET_COMPOSITION } from '../chemistry/elements.js';
import { computeGroupTotals } from '../chemistry/resource-groups.js';
import { orbitalPeriodYears, orbitalPeriodDays } from '../physics/kepler.js';
import type { Planet } from '../types/planet.js';
import type { Star } from '../types/star.js';

/** Compute totalResources for an Earth-like planet with given mass multiplier */
function computeEarthLikeTotalResources(massMultiplier: number): {
  minerals: number; volatiles: number; isotopes: number;
  elements: Record<string, number>;
} {
  const planetMassKg = EARTH_MASS * massMultiplier;
  const extractability = 0.01; // 1% accessible crust+upper mantle
  const elements: Record<string, number> = {};

  for (const [el, fraction] of Object.entries(ROCKY_PLANET_COMPOSITION)) {
    elements[el] = planetMassKg * fraction * extractability;
  }

  const groupTotals = computeGroupTotals(elements);
  return {
    minerals: groupTotals.mineral,
    volatiles: groupTotals.volatile,
    isotopes: groupTotals.isotope,
    elements,
  };
}

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
      totalResources: computeEarthLikeTotalResources(1.0),
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

/**
 * Generate the "paradise" planet for Ring 1 — identical for all players.
 * Earth-sized with water, ocean, land, glaciers, desert, abundant resources.
 * Similar to home planet but isHomePlanet=false, isColonizable=true.
 */
export function generateParadisePlanet(star: Star, systemSeed: number, name: string): Planet {
  const rng = new SeededRNG(systemSeed + 7777);

  const hzMid = (star.habitableZone.innerConservativeAU + star.habitableZone.outerConservativeAU) / 2;

  return {
    id: `planet-paradise-${systemSeed}`,
    seed: systemSeed + 7777,
    name,
    type: 'terrestrial',
    zone: 'habitable',

    massEarth: 1.0,
    radiusEarth: 1.0,
    densityGCm3: 5.51,
    surfaceGravityG: 1.0,
    escapeVelocityKmS: 11.19,

    orbit: {
      semiMajorAxisAU: hzMid,
      eccentricity: 0.02,
      inclinationDeg: 1.2,
      longitudeOfAscendingNodeDeg: rng.nextFloat(0, 360),
      argumentOfPeriapsisDeg: rng.nextFloat(0, 360),
      meanAnomalyDeg: rng.nextFloat(0, 360),
      periodYears: orbitalPeriodYears(hzMid, star.massSolar),
      periodDays: orbitalPeriodDays(hzMid, star.massSolar),
    },

    equilibriumTempK: 255,
    surfaceTempK: 288, // Earth average (15 C) — temperate, green
    albedo: 0.30,

    atmosphere: {
      surfacePressureAtm: 1.0,
      composition: { ...EARTH_ATMOSPHERE },
      greenhouse: 1.0,
      hasOzone: true,
    },

    hydrosphere: {
      waterCoverageFraction: 0.65, // 35% land — plenty of room for colony
      oceanDepthKm: 3.5,
      iceCapFraction: 0.04, // minimal ice caps
      hasSubsurfaceOcean: false,
    },

    magneticField: {
      strengthT: 4.5e-5,
      hasMagnetosphere: true,
    },

    resources: {
      crustComposition: { ...EARTH_CRUST_COMPOSITION },
      deposits: [
        { element: 'Fe', abundanceRelative: 1.2, depth: 'shallow' },
        { element: 'Cu', abundanceRelative: 1.1, depth: 'shallow' },
        { element: 'Al', abundanceRelative: 1.0, depth: 'surface' },
        { element: 'Si', abundanceRelative: 1.2, depth: 'surface' },
        { element: 'Ti', abundanceRelative: 0.9, depth: 'deep' },
        { element: 'U', abundanceRelative: 0.4, depth: 'deep' },
        { element: 'Ni', abundanceRelative: 0.9, depth: 'deep' },
        // Pt is guaranteed on the paradise planet so the L48 genesis_vault
        // is reachable by the player. Without this, players whose paradise
        // planet didn't roll Pt unique resource were permanently locked
        // out of the endgame building.
        { element: 'Pt', abundanceRelative: 0.3, depth: 'deep' },
      ],
      totalResources: computeEarthLikeTotalResources(1.0),
    },

    habitability: {
      temperature: 1.0,
      atmosphere: 1.0,
      water: 1.0,
      magneticField: 1.0,
      gravity: 1.0,
      overall: 1.0,  // perfect — ideal new home
    },

    hasLife: true,
    lifeComplexity: 'multicellular',

    moons: [
      {
        id: `moon-paradise-${systemSeed}`,
        seed: systemSeed + 7778,
        name: 'Selene',
        massKg: 3.8e22,
        radiusKm: 1200,
        densityGCm3: 3.2,
        compositionType: 'rocky',
        orbitalRadiusKm: 310000,
        orbitalPeriodDays: 22.5,
        surfaceTempK: 190,
        hasAtmosphere: false,
        tidallyLocked: true,
      },
    ],

    isHomePlanet: false,
    isColonizable: true,
    terraformDifficulty: 0,
  };
}
