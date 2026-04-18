import { SeededRNG } from '../math/rng.js';
import { RING_DISTANCE_LY, systemsPerRing, RINGS_PER_REGISTRATION } from '../constants/game.js';
import { generateStarSystem } from './star-system-generator.js';
import { generateHomePlanet, generateParadisePlanet } from './home-planet-generator.js';
import { calculateHabitability } from '../biology/habitability.js';
import { getPlayerHomeCoordinates, hexToPixel, PLAYER_SPACING } from './galaxy-topology.js';
import type { StarSystem, GalaxyRing } from '../types/universe.js';
import type { Planet } from '../types/planet.js';

/**
 * Hex ring coordinate system.
 * Ring 0: center (1 position)
 * Ring n: 6*n positions around the center
 *
 * Returns positions in light-years (x, y) relative to center.
 */
export function hexRingPositions(ringIndex: number, centerX: number, centerY: number): { x: number; y: number }[] {
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
export function systemSeedFromPosition(galaxySeed: number, x: number, y: number): number {
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

  // Clear any colonizable flags across ALL rings (safety net)
  for (const ring of rings) {
    for (const sys of ring.starSystems) {
      for (const p of sys.planets) {
        if (p.isColonizable) p.isColonizable = false;
      }
    }
  }

  // Place exactly one paradise planet in Ring 1 — the only evacuation target
  placeParadisePlanetInRing(rings, 1);

  return rings;
}

/**
 * Place exactly one paradise planet in the given ring.
 * Finds first system with a habitable-zone rocky planet and replaces it,
 * or inserts at index 2 of the first system.
 */
function placeParadisePlanetInRing(rings: GalaxyRing[], ringIndex: number): void {
  const ring = rings.find((r) => r.ringIndex === ringIndex);
  if (!ring || ring.starSystems.length === 0) return;

  // Find best system: one with a habitable-zone rocky planet
  let targetSystem = ring.starSystems[0];
  let replaceIndex = -1;

  for (const sys of ring.starSystems) {
    const idx = sys.planets.findIndex(p => p.zone === 'habitable' && p.type === 'rocky');
    if (idx >= 0) {
      targetSystem = sys;
      replaceIndex = idx;
      break;
    }
  }

  const paradise = generateParadisePlanet(
    targetSystem.star,
    targetSystem.seed,
    targetSystem.star.name + ' ' + ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][replaceIndex >= 0 ? replaceIndex : 2],
  );

  if (replaceIndex >= 0) {
    targetSystem.planets[replaceIndex] = paradise;
  } else {
    const insertAt = Math.min(2, targetSystem.planets.length);
    targetSystem.planets.splice(insertAt, 0, paradise);
  }
}

/**
 * Assign a position for a new player in the galaxy.
 * Uses hex-grid super-grid placement for even spacing.
 * Returns position in light-years.
 */
export function assignPlayerPosition(galaxySeed: number, playerIndex: number): { x: number; y: number } {
  const hexCoord = getPlayerHomeCoordinates(galaxySeed, playerIndex);
  // Convert hex coord to LY position using RING_DISTANCE_LY as hex size
  const pos = hexToPixel(hexCoord.q, hexCoord.r, RING_DISTANCE_LY);
  return {
    x: Math.round(pos.x * 100) / 100,
    y: Math.round(pos.y * 100) / 100,
  };
}
