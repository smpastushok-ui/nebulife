import { SeededRNG } from '../math/rng.js';
import { RING_DISTANCE_LY, systemsPerRing, RINGS_PER_REGISTRATION } from '../constants/game.js';
import { generateStarSystem } from './star-system-generator.js';
import { generateHomePlanet } from './home-planet-generator.js';
import { calculateHabitability } from '../biology/habitability.js';
import type { StarSystem, GalaxyRing } from '../types/universe.js';
import type { Planet } from '../types/planet.js';

/**
 * Hex ring coordinate system.
 * Ring 0: center (1 position)
 * Ring n: 6*n positions around the center
 *
 * Returns positions in light-years (x, y) relative to center.
 */
function hexRingPositions(ringIndex: number, centerX: number, centerY: number): { x: number; y: number }[] {
  if (ringIndex === 0) {
    return [{ x: centerX, y: centerY }];
  }

  const positions: { x: number; y: number }[] = [];
  const distance = ringIndex * RING_DISTANCE_LY;

  // Hex directions (60-degree intervals)
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: 0.5, dy: Math.sqrt(3) / 2 },
    { dx: -0.5, dy: Math.sqrt(3) / 2 },
    { dx: -1, dy: 0 },
    { dx: -0.5, dy: -Math.sqrt(3) / 2 },
    { dx: 0.5, dy: -Math.sqrt(3) / 2 },
  ];

  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < ringIndex; step++) {
      // Start at corner, walk along side
      const startAngle = (side * Math.PI) / 3;
      const cornerX = centerX + distance * Math.cos(startAngle);
      const cornerY = centerY + distance * Math.sin(startAngle);

      // Walk along the side
      const nextSide = (side + 2) % 6; // direction along the side
      const sideDir = dirs[nextSide];
      const stepSize = RING_DISTANCE_LY;

      const x = cornerX + step * sideDir.dx * stepSize;
      const y = cornerY + step * sideDir.dy * stepSize;

      positions.push({
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
      });
    }
  }

  return positions;
}

/**
 * Generate a deterministic seed for a star system at a given position.
 * Ensures that overlapping systems from different players are identical.
 */
function systemSeedFromPosition(galaxySeed: number, x: number, y: number): number {
  // Quantize position to avoid floating-point issues
  const qx = Math.round(x * 100);
  const qy = Math.round(y * 100);
  // Hash-combine galaxy seed with quantized position
  let hash = galaxySeed;
  hash = Math.imul(hash ^ qx, 0x45d9f3b);
  hash = Math.imul(hash ^ qy, 0x45d9f3b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

/**
 * Generate the ring structure for a player's area of the galaxy.
 *
 * @param galaxySeed - The galaxy's master seed
 * @param centerX - Player's home system X position (light-years)
 * @param centerY - Player's home system Y position (light-years)
 * @param playerId - Player ID (for home system marking)
 * @returns Array of GalaxyRings (ring 0 = home, rings 1-2 = exploration area)
 */
export function generatePlayerRings(
  galaxySeed: number,
  centerX: number,
  centerY: number,
  playerId: string,
): GalaxyRing[] {
  const rings: GalaxyRing[] = [];

  for (let ringIdx = 0; ringIdx <= RINGS_PER_REGISTRATION; ringIdx++) {
    const positions = hexRingPositions(ringIdx, centerX, centerY);
    const systems: StarSystem[] = [];

    for (const pos of positions) {
      const sysSeed = systemSeedFromPosition(galaxySeed, pos.x, pos.y);
      const system = generateStarSystem(sysSeed, { x: pos.x, y: pos.y, z: 0 }, ringIdx);

      // Ring 0 is the player's home system
      if (ringIdx === 0) {
        system.ownerPlayerId = playerId;
        system.isExplored = true;
        system.exploredByPlayerId = playerId;

        // Replace first habitable-zone rocky planet with home planet
        const homePlanet = generateHomePlanet(system.star, sysSeed);
        const hzPlanetIdx = system.planets.findIndex(p => p.zone === 'habitable' && p.type === 'rocky');
        if (hzPlanetIdx >= 0) {
          homePlanet.name = `${system.star.name} ${['I', 'II', 'III', 'IV', 'V'][hzPlanetIdx] ?? (hzPlanetIdx + 1)}`;
          system.planets[hzPlanetIdx] = homePlanet;
        } else {
          // Force-insert home planet in habitable zone
          homePlanet.name = `${system.star.name} III`;
          system.planets.splice(Math.min(2, system.planets.length), 0, homePlanet);
        }
      }

      systems.push(system);
    }

    rings.push({ ringIndex: ringIdx, starSystems: systems });
  }

  // Guarantee at least one colonizable planet in Ring 1
  ensureColonizablePlanetInRing(rings, 1);

  return rings;
}

/**
 * Ensure at least one system in the given ring has a colonizable planet.
 * If none exists, force-upgrade the best candidate rocky planet.
 */
function ensureColonizablePlanetInRing(rings: GalaxyRing[], ringIndex: number): void {
  const ring = rings.find((r) => r.ringIndex === ringIndex);
  if (!ring) return;

  // Check if any planet in this ring is already colonizable
  const hasColonizable = ring.starSystems.some((sys) =>
    sys.planets.some((p) => p.isColonizable && !p.isHomePlanet),
  );
  if (hasColonizable) return;

  // Find best candidate: rocky planet closest to habitable zone
  let bestPlanet: Planet | null = null;
  let bestScore = -1;

  for (const sys of ring.starSystems) {
    for (const planet of sys.planets) {
      if (planet.type !== 'rocky' || planet.isHomePlanet) continue;
      // Prefer planets already in habitable zone, then inner zone
      let score = 0;
      if (planet.zone === 'habitable') score = 3;
      else if (planet.zone === 'inner') score = 2;
      else if (planet.zone === 'outer') score = 1;
      // Prefer larger rocky planets
      score += Math.min(planet.massEarth, 2) * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestPlanet = planet;
      }
    }
  }

  if (!bestPlanet) return;

  // Force-upgrade the planet to be marginally colonizable
  bestPlanet.surfaceTempK = 275;
  bestPlanet.atmosphere = {
    surfacePressureAtm: 0.7,
    composition: { N2: 0.80, O2: 0.15, CO2: 0.003, Ar: 0.01 },
    greenhouse: 0.6,
    hasOzone: true,
  };
  bestPlanet.hydrosphere = {
    waterCoverageFraction: 0.35,
    oceanDepthKm: 1.2,
    iceCapFraction: 0.08,
    hasSubsurfaceOcean: false,
  };
  bestPlanet.magneticField = {
    strengthT: 3e-5,
    hasMagnetosphere: true,
  };

  // Recalculate habitability
  bestPlanet.habitability = calculateHabitability(
    bestPlanet.surfaceTempK,
    bestPlanet.atmosphere,
    bestPlanet.hydrosphere,
    bestPlanet.magneticField,
    bestPlanet.surfaceGravityG,
  );
  bestPlanet.isColonizable = bestPlanet.habitability.overall > 0.3;
  bestPlanet.terraformDifficulty = Math.round((1 - bestPlanet.habitability.overall) * 1000) / 1000;
}

/**
 * Assign a position for a new player in the galaxy.
 * Spreads players across the galaxy to minimize overlap initially.
 */
export function assignPlayerPosition(galaxySeed: number, playerIndex: number): { x: number; y: number } {
  const rng = new SeededRNG(galaxySeed);
  // Spiral distribution: each player gets a position further out
  const angle = playerIndex * 2.399963; // Golden angle in radians
  const radius = 20 + playerIndex * 15; // Increasing distance from center

  return {
    x: Math.round(radius * Math.cos(angle) * 100) / 100,
    y: Math.round(radius * Math.sin(angle) * 100) / 100,
  };
}
