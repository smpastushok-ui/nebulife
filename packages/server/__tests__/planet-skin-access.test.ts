import { describe, expect, it } from 'vitest';
import { generateStarSystem } from '@nebulife/core';
import type { PlayerRow } from '../src/db.js';
import { validatePlanetSkinTarget } from '../src/planet-skin-access.js';

function playerFor(systemId: string, complete = true): PlayerRow {
  return {
    id: 'player-a',
    home_system_id: 'system-home',
    home_planet_id: 'planet-home',
    game_state: {
      research_state: {
        systems: {
          [systemId]: { isComplete: complete, progress: complete ? 100 : 20 },
        },
      },
    },
  } as PlayerRow;
}

describe('planet skin access', () => {
  it('accepts an exact canonical researched system and planet', () => {
    const system = generateStarSystem(1234);
    const result = validatePlanetSkinTarget(playerFor(system.id), system.id, system.planets[0].id, system);
    expect(result.ok).toBe(true);
  });

  it('rejects systems the player does not own or fully research', () => {
    const system = generateStarSystem(1234);
    const result = validatePlanetSkinTarget(playerFor(system.id, false), system.id, system.planets[0].id, system);
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it('rejects a planet injected under another canonical system identity', () => {
    const systemA = generateStarSystem(1234);
    const systemB = generateStarSystem(5678);
    const forged = { ...systemA, planets: [systemB.planets[0], ...systemA.planets] };
    const result = validatePlanetSkinTarget(playerFor(systemA.id), systemA.id, systemB.planets[0].id, forged);
    expect(result).toMatchObject({ ok: false, status: 400 });
  });
});
