import { generateStarSystem, type StarSystem } from '@nebulife/core';
import type { PlayerRow } from './db.js';

type AccessResult =
  | { ok: true; system: StarSystem }
  | { ok: false; status: 400 | 403; error: string };

function hasSystemAccess(player: PlayerRow, systemId: string): boolean {
  if (player.home_system_id === systemId) return true;
  const research = player.game_state?.research_state as {
    systems?: Record<string, { isComplete?: boolean; progress?: number }>;
  } | undefined;
  const entry = research?.systems?.[systemId];
  return entry?.isComplete === true || (entry?.progress ?? 0) >= 100;
}

/**
 * Rejects client-forged system/planet pairs before paid generation or lookup.
 * Physics data for ordinary systems is regenerated server-side from the
 * canonical seed; special home/paradise worlds retain their validated payload.
 */
export function validatePlanetSkinTarget(
  player: PlayerRow,
  systemId: string,
  planetId: string,
  candidate: StarSystem,
): AccessResult {
  if (!hasSystemAccess(player, systemId)) {
    return { ok: false, status: 403, error: 'Planet system is not owned or fully researched' };
  }
  const canonicalPersonalId = `system-${candidate.seed}`;
  const canonicalCoreId = new RegExp(`^core-\\d+-${candidate.seed}$`).test(candidate.id);
  if (
    !Number.isSafeInteger(candidate.seed)
    || candidate.id !== systemId
    || (candidate.id !== canonicalPersonalId && !canonicalCoreId)
  ) {
    return { ok: false, status: 400, error: 'Invalid canonical system identity' };
  }

  const submittedPlanet = candidate.planets.find((planet) => planet.id === planetId);
  if (!submittedPlanet) {
    return { ok: false, status: 400, error: 'Planet not found in submitted system' };
  }

  const generated = generateStarSystem(candidate.seed, candidate.position, candidate.ringIndex);
  generated.id = candidate.id;
  const canonicalPlanet = generated.planets.find((planet) => planet.id === planetId);
  if (canonicalPlanet) {
    return { ok: true, system: generated };
  }

  const isOwnedHome = systemId === player.home_system_id && planetId === player.home_planet_id;
  const isCanonicalSpecial = planetId === `planet-home-${candidate.seed}`
    || planetId === `planet-paradise-${candidate.seed}`;
  if (!isOwnedHome && !isCanonicalSpecial) {
    return { ok: false, status: 400, error: 'Planet identity does not belong to canonical system seed' };
  }
  return { ok: true, system: candidate };
}
