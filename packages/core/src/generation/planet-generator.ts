import { SeededRNG } from '../math/rng.js';
import { EARTH_MASS, EARTH_RADIUS, AU, SOLAR_RADIUS, SECONDS_PER_DAY } from '../constants/physics.js';
import { orbitalPeriodYears, orbitalPeriodDays, orbitalPeriodSeconds } from '../physics/kepler.js';
import { surfaceGravityG, escapeVelocity as calcEscapeVelocity } from '../physics/gravity.js';
import { equilibriumTemperature, surfaceTemperatureWithGreenhouse } from '../physics/radiation.js';
import { isInHabitableZone, type HabitableZone } from '../physics/habitable-zone.js';
import { generateAtmosphere, type PlanetZone } from '../chemistry/atmosphere.js';
import { generateHydrosphere } from '../chemistry/water.js';
import { generateResources } from '../chemistry/minerals.js';
import { calculateHabitability, type MagneticField } from '../biology/habitability.js';
import { rollForLife } from '../biology/life-probability.js';
import type { Planet, PlanetType, Moon, MoonComposition } from '../types/planet.js';
import type { OrbitalParameters } from '../types/orbit.js';
import type { Star } from '../types/star.js';

/** Determine planet zone from orbital distance and habitable zone */
function determinePlanetZone(distanceAU: number, hz: HabitableZone): PlanetZone {
  if (distanceAU < hz.innerOptimisticAU) return 'inner';
  if (distanceAU <= hz.outerOptimisticAU) return 'habitable';
  if (distanceAU < hz.outerOptimisticAU * 3) return 'outer';
  return 'far';
}

/** Determine planet type from zone and mass */
function determinePlanetType(rng: SeededRNG, zone: PlanetZone, massEarth: number): PlanetType {
  if (massEarth < 0.01) return 'dwarf';
  if (zone === 'inner' || zone === 'habitable') {
    if (massEarth > 10) return rng.nextBool(0.7) ? 'gas-giant' : 'ice-giant';
    return 'rocky';
  }
  if (zone === 'outer') {
    if (massEarth > 50) return 'gas-giant';
    if (massEarth > 5) return rng.nextBool(0.5) ? 'gas-giant' : 'ice-giant';
    return massEarth > 0.1 ? 'rocky' : 'dwarf';
  }
  // Far zone
  if (massEarth > 20) return 'ice-giant';
  if (massEarth > 0.1) return 'rocky';
  return 'dwarf';
}

/** Generate mass based on zone */
function generateMass(rng: SeededRNG, zone: PlanetZone, slotIndex: number): number {
  switch (zone) {
    case 'inner':
      return rng.nextGaussianClamped(0.6, 0.5, 0.02, 3.0);
    case 'habitable':
      return rng.nextGaussianClamped(1.0, 0.5, 0.1, 5.0);
    case 'outer':
      // Mix of rocky and giant planets
      if (rng.nextBool(0.4)) {
        return rng.nextGaussianClamped(100, 200, 10, 3000); // Giant
      }
      return rng.nextGaussianClamped(1.5, 1.0, 0.1, 10);
    case 'far':
      return rng.nextGaussianClamped(0.5, 0.8, 0.01, 30);
  }
}

/** Mass-radius relationship for rocky planets (Earth units) */
function radiusFromMassRocky(massEarth: number): number {
  if (massEarth <= 1) return Math.pow(massEarth, 0.27);
  return Math.pow(massEarth, 0.55);
}

/** Mass-radius for gas giants (Earth units) */
function radiusFromMassGiant(massEarth: number): number {
  // Jupiter is ~318 Earth masses, ~11.2 Earth radii
  if (massEarth < 300) return 3.0 + Math.pow(massEarth / 10, 0.45);
  // Above Jupiter mass, radius stays roughly constant (degeneracy pressure)
  return 11.2 * Math.pow(massEarth / 318, -0.04);
}

/** Generate magnetic field */
function generateMagneticField(rng: SeededRNG, massEarth: number, type: PlanetType): MagneticField {
  if (type === 'gas-giant' || type === 'ice-giant') {
    return { strengthT: rng.nextFloat(1e-4, 1e-3), hasMagnetosphere: true };
  }
  if (massEarth >= 0.5 && rng.nextBool(0.6)) {
    const strength = rng.nextFloat(1e-6, 1e-4);
    return { strengthT: strength, hasMagnetosphere: strength > 1e-5 };
  }
  return { strengthT: rng.nextFloat(0, 1e-7), hasMagnetosphere: false };
}

/** Generate planet name */
function generatePlanetName(starName: string, index: number): string {
  const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return `${starName} ${romanNumerals[index] ?? (index + 1)}`;
}

/**
 * Generate a planet at a given orbital slot.
 */
export function generatePlanet(
  seed: number,
  star: Star,
  orbitalDistanceAU: number,
  planetIndex: number,
): Planet {
  const rng = new SeededRNG(seed);
  const zone = determinePlanetZone(orbitalDistanceAU, star.habitableZone);

  // Mass and type
  const massEarth = generateMass(rng, zone, planetIndex);
  const type = determinePlanetType(rng, zone, massEarth);

  // Radius
  const radiusEarth = type === 'rocky' || type === 'dwarf'
    ? radiusFromMassRocky(massEarth)
    : radiusFromMassGiant(massEarth);

  // Physical properties
  const massKg = massEarth * EARTH_MASS;
  const radiusM = radiusEarth * EARTH_RADIUS;
  const volume = (4 / 3) * Math.PI * radiusM ** 3;
  const densityKgM3 = massKg / volume;
  const densityGCm3 = densityKgM3 / 1000;
  const gravity = surfaceGravityG(massKg, radiusM);
  const vEsc = calcEscapeVelocity(massKg, radiusM) / 1000; // km/s

  // Orbital parameters
  const eccentricity = rng.nextFloat(0, 0.15);
  const orbit: OrbitalParameters = {
    semiMajorAxisAU: orbitalDistanceAU,
    eccentricity,
    inclinationDeg: rng.nextFloat(0, 5),
    longitudeOfAscendingNodeDeg: rng.nextFloat(0, 360),
    argumentOfPeriapsisDeg: rng.nextFloat(0, 360),
    meanAnomalyDeg: rng.nextFloat(0, 360),
    periodYears: orbitalPeriodYears(orbitalDistanceAU, star.massSolar),
    periodDays: orbitalPeriodDays(orbitalDistanceAU, star.massSolar),
  };

  // Temperature
  const albedo = type === 'rocky'
    ? rng.nextFloat(0.1, 0.5)
    : rng.nextFloat(0.3, 0.5);

  const starRadiusM = star.radiusSolar * SOLAR_RADIUS;
  const orbitalDistanceM = orbitalDistanceAU * AU;
  const eqTemp = equilibriumTemperature(star.temperatureK, starRadiusM, orbitalDistanceM, albedo);

  // Generate atmosphere first (needed for greenhouse)
  const isHabitable = isInHabitableZone(orbitalDistanceAU, star.habitableZone, false);
  // Pre-check: will this planet have life? (need to know for O2 in atmosphere)
  const lifeCheckRng = rng.child(999);
  const preLifeRoll = isHabitable && massEarth >= 0.3 && massEarth <= 5 && type === 'rocky';

  const atmosphere = generateAtmosphere(
    rng.child(1001),
    massKg,
    radiusM,
    eqTemp,
    zone,
    preLifeRoll && lifeCheckRng.next() < 0.15, // rough pre-check
  );

  const greenhouse = atmosphere?.greenhouse ?? 0;
  const surfaceTempK = Math.round(surfaceTemperatureWithGreenhouse(eqTemp, greenhouse));

  // Hydrosphere
  const hydrosphere = generateHydrosphere(rng.child(1002), surfaceTempK, atmosphere, zone, massEarth);

  // Magnetic field
  const magneticField = generateMagneticField(rng.child(1003), massEarth, type);

  // Resources
  const resources = generateResources(rng.child(1004), type === 'rocky' || type === 'dwarf');

  // Habitability
  const habitability = calculateHabitability(surfaceTempK, atmosphere, hydrosphere, magneticField, gravity);

  // Life
  const lifeResult = rollForLife(rng.child(1005), habitability.overall, star.ageGyr);

  // Moons
  const moons = generateMoons(rng.child(1006), type, massEarth);

  // Terraform difficulty
  const terraformDifficulty = 1 - habitability.overall;

  return {
    id: `planet-${seed}`,
    seed,
    name: generatePlanetName(star.name, planetIndex),
    type,
    zone,
    massEarth: round(massEarth, 4),
    radiusEarth: round(radiusEarth, 4),
    densityGCm3: round(densityGCm3, 2),
    surfaceGravityG: round(gravity, 3),
    escapeVelocityKmS: round(vEsc, 2),
    orbit,
    equilibriumTempK: Math.round(eqTemp),
    surfaceTempK,
    albedo: round(albedo, 3),
    atmosphere,
    hydrosphere,
    magneticField,
    resources,
    habitability,
    hasLife: lifeResult.hasLife,
    lifeComplexity: lifeResult.complexity,
    moons,
    isHomePlanet: false,
    isColonizable: habitability.overall > 0.3,
    terraformDifficulty: round(terraformDifficulty, 3),
  };
}

/** Generate moons for a planet with Kepler-correct orbital periods */
function generateMoons(rng: SeededRNG, type: PlanetType, massEarth: number): Moon[] {
  let moonCount: number;

  if (type === 'gas-giant') {
    moonCount = rng.nextInt(2, 8);
  } else if (type === 'ice-giant') {
    moonCount = rng.nextInt(1, 5);
  } else if (massEarth > 0.5) {
    moonCount = rng.nextBool(0.5) ? rng.nextInt(0, 2) : 0;
  } else {
    moonCount = rng.nextBool(0.1) ? 1 : 0;
  }

  const planetMassKg = massEarth * EARTH_MASS;

  // Generate orbital radii first and sort so inner moons are first
  const orbitalRadii: number[] = [];
  for (let i = 0; i < moonCount; i++) {
    const moonRng = rng.child(i);
    orbitalRadii.push(moonRng.nextFloat(10000, 500000));
  }
  orbitalRadii.sort((a, b) => a - b);

  const moons: Moon[] = [];
  for (let i = 0; i < moonCount; i++) {
    const moonRng = rng.child(i);
    const moonMassKg = moonRng.nextFloat(1e18, planetMassKg * 0.01);

    // Composition and density
    const compRoll = moonRng.next();
    let compositionType: MoonComposition;
    let density: number; // g/cm³
    if (compRoll < 0.15) {
      compositionType = 'metallic';
      density = moonRng.nextFloat(5.0, 8.0);
    } else if (compRoll < 0.25) {
      compositionType = 'volcanic';
      density = moonRng.nextFloat(3.0, 4.5);
    } else if (compRoll < 0.55) {
      compositionType = 'icy';
      density = moonRng.nextFloat(0.9, 2.0);
    } else {
      compositionType = 'rocky';
      density = moonRng.nextFloat(2.5, 4.0);
    }

    // Radius from mass + density: V = m/ρ, r = ∛(3V/(4π))
    const densityKgM3 = density * 1000;
    const volume = moonMassKg / densityKgM3;
    const moonRadiusKm = Math.cbrt(3 * volume / (4 * Math.PI)) / 1000;

    // Orbital radius (sorted inner→outer)
    const orbitalRadiusKm = orbitalRadii[i];

    // Kepler's 3rd law: period from orbital radius + planet mass
    const orbitalRadiusM = orbitalRadiusKm * 1000;
    const periodS = orbitalPeriodSeconds(orbitalRadiusM, planetMassKg, moonMassKg);
    const periodDays = periodS / SECONDS_PER_DAY;

    moons.push({
      id: `moon-${rng.deriveSeed(i)}`,
      seed: rng.deriveSeed(i),
      name: `Moon ${String.fromCharCode(97 + i)}`,
      massKg: moonMassKg,
      radiusKm: round(Math.max(10, moonRadiusKm), 1),
      densityGCm3: round(density, 2),
      compositionType,
      orbitalRadiusKm: round(orbitalRadiusKm, 0),
      orbitalPeriodDays: round(periodDays, 3),
      surfaceTempK: Math.round(moonRng.nextFloat(50, 300)),
      hasAtmosphere: moonRadiusKm > 1000 && moonRng.nextBool(0.2),
      tidallyLocked: moonRng.nextBool(0.7),
    });
  }

  return moons;
}

function round(n: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(n * factor) / factor;
}
