import { SeededRNG } from '../math/rng.js';
import { MIN_PLANETS, MAX_PLANETS, MEAN_PLANETS } from '../constants/game.js';
import { generateStar } from './star-generator.js';
import { generatePlanet } from './planet-generator.js';
import type { StarSystem, AsteroidBelt } from '../types/universe.js';

/**
 * Generate orbital slots using modified Titius-Bode rule with noise.
 * a_n = baseAU + spacing * 2^n  (with random perturbation)
 */
function generateOrbitalSlots(rng: SeededRNG, count: number, starRadiusSolar: number): number[] {
  const minDistAU = Math.max(0.05, starRadiusSolar * 0.01); // Minimum safe distance
  const baseAU = rng.nextFloat(0.1, 0.4);
  const spacing = rng.nextFloat(0.15, 0.4);

  const slots: number[] = [];
  for (let n = 0; n < count; n++) {
    const rawDistance = baseAU + spacing * Math.pow(2, n * rng.nextFloat(0.7, 1.0));
    const perturbation = rng.nextFloat(0.85, 1.15);
    const distance = Math.max(minDistAU, rawDistance * perturbation);
    slots.push(Math.round(distance * 10000) / 10000);
  }

  // Sort and ensure minimum separation (proportional to distance for realistic spacing)
  // Real planetary systems have gaps scaling with orbital distance (Hill sphere ~ a * (M_p/3M_*)^(1/3))
  slots.sort((a, b) => a - b);
  for (let i = 1; i < slots.length; i++) {
    // Minimum gap: 20% of inner orbit or 0.15 AU, whichever is larger.
    // Prevents unrealistic crowding of neighboring orbits, especially for outer planets.
    const minGap = Math.max(0.15, slots[i - 1] * 0.20);
    if (slots[i] - slots[i - 1] < minGap) {
      slots[i] = slots[i - 1] + minGap + rng.nextFloat(0, minGap * 0.3);
    }
  }

  return slots;
}

/** Generate star system name */
function generateSystemName(rng: SeededRNG): string {
  const catalog = rng.pick(['HD', 'HIP', 'TYC', 'GJ', 'TOI', 'KEP', 'NEB']);
  const number = rng.nextInt(1000, 99999);
  return `${catalog}-${number}`;
}

/** Generate asteroid belt */
function generateAsteroidBelt(rng: SeededRNG, innerAU: number, outerAU: number): AsteroidBelt {
  return {
    innerRadiusAU: innerAU,
    outerRadiusAU: outerAU,
    density: rng.nextFloat(0.1, 0.8),
    composition: {
      Si: rng.nextFloat(0.2, 0.4),
      Fe: rng.nextFloat(0.1, 0.3),
      C: rng.nextFloat(0.05, 0.2),
      Ni: rng.nextFloat(0.01, 0.1),
      H2O: rng.nextFloat(0.05, 0.2),
    },
  };
}

/**
 * Generate a complete star system from a seed.
 *
 * Process:
 * 1. Generate star
 * 2. Determine planet count (Gaussian around MEAN_PLANETS)
 * 3. Generate orbital slots (Titius-Bode)
 * 4. Generate planets at each slot
 * 5. Optionally add asteroid belts
 */
export function generateStarSystem(
  seed: number,
  position: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
  ringIndex: number = 0,
): StarSystem {
  const rng = new SeededRNG(seed);

  // 1. Star
  const starSeed = rng.deriveSeed(0);
  const star = generateStar(starSeed);

  // 2. Planet count
  const planetCount = Math.round(
    rng.nextGaussianClamped(MEAN_PLANETS, 2, MIN_PLANETS, MAX_PLANETS),
  );

  // 3. Orbital slots
  const slots = generateOrbitalSlots(rng.child(1), planetCount, star.radiusSolar);

  // 4. Planets
  const planets = slots.map((distanceAU, i) => {
    const planetSeed = rng.deriveSeed(i + 1);
    return generatePlanet(planetSeed, star, distanceAU, i);
  });

  // 5. Asteroid belts (0-2)
  const asteroidBelts: AsteroidBelt[] = [];
  if (planets.length >= 4 && rng.nextBool(0.6)) {
    // Belt between inner rocky and outer gas planets
    const innerRockyEnd = planets.findIndex(p => p.type === 'gas-giant' || p.type === 'ice-giant');
    if (innerRockyEnd > 0 && innerRockyEnd < planets.length) {
      const inner = planets[innerRockyEnd - 1].orbit.semiMajorAxisAU * 1.2;
      const outer = planets[innerRockyEnd].orbit.semiMajorAxisAU * 0.8;
      if (outer > inner) {
        asteroidBelts.push(generateAsteroidBelt(rng.child(100), inner, outer));
      }
    }
  }
  // Outer Kuiper-belt-like structure
  if (rng.nextBool(0.4) && planets.length > 0) {
    const outermost = planets[planets.length - 1].orbit.semiMajorAxisAU;
    asteroidBelts.push(generateAsteroidBelt(rng.child(101), outermost * 1.5, outermost * 3));
  }

  return {
    id: `system-${seed}`,
    seed,
    name: generateSystemName(rng),
    position,
    star,
    planets,
    asteroidBelts,
    ringIndex,
    isExplored: false,
    exploredByPlayerId: null,
    ownerPlayerId: null,
  };
}
