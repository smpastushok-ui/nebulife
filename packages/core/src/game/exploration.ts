import { RING_DISTANCE_LY } from '../constants/game.js';
import type { StarSystem } from '../types/universe.js';

/** Check if a star system is within exploration range of the player */
export function isWithinExplorationRange(
  playerPos: { x: number; y: number },
  systemPos: { x: number; y: number },
  maxRings: number,
): boolean {
  const dx = playerPos.x - systemPos.x;
  const dy = playerPos.y - systemPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= maxRings * RING_DISTANCE_LY * 1.1; // 10% tolerance
}

/** Sort star systems by distance from a point */
export function sortByDistance(
  systems: StarSystem[],
  from: { x: number; y: number },
): StarSystem[] {
  return [...systems].sort((a, b) => {
    const distA = Math.hypot(a.position.x - from.x, a.position.y - from.y);
    const distB = Math.hypot(b.position.x - from.x, b.position.y - from.y);
    return distA - distB;
  });
}

/** Find the best colonization targets within explored systems */
export function rankColonizationTargets(systems: StarSystem[]): {
  system: StarSystem;
  planet: { id: string; name: string; habitabilityScore: number; hasLife: boolean };
  distance: number;
}[] {
  const targets: {
    system: StarSystem;
    planet: { id: string; name: string; habitabilityScore: number; hasLife: boolean };
    distance: number;
  }[] = [];

  for (const system of systems) {
    if (!system.isExplored) continue;

    for (const planet of system.planets) {
      if (planet.isHomePlanet) continue;
      if (planet.habitability.overall < 0.3) continue;

      targets.push({
        system,
        planet: {
          id: planet.id,
          name: planet.name,
          habitabilityScore: planet.habitability.overall,
          hasLife: planet.hasLife,
        },
        distance: Math.hypot(system.position.x, system.position.y),
      });
    }
  }

  // Sort by habitability score (descending)
  return targets.sort((a, b) => b.planet.habitabilityScore - a.planet.habitabilityScore);
}
