import { describe, expect, it } from 'vitest';
import { planetSkinIdentityKey, planetSkinStorageKey } from '../src/game/planet-skin-identity.js';

describe('planet skin identity', () => {
  it('isolates identical planet IDs across systems and players', () => {
    const base = { playerId: 'player-a', systemId: 'system-a', planetId: 'planet-42', kind: 'exosphere' as const };
    expect(planetSkinIdentityKey(base)).not.toBe(planetSkinIdentityKey({ ...base, systemId: 'system-b' }));
    expect(planetSkinIdentityKey(base)).not.toBe(planetSkinIdentityKey({ ...base, playerId: 'player-b' }));
  });

  it('is deterministic and delimiter-collision safe', () => {
    const first = { playerId: 'a|1:b', systemId: 'c', planetId: 'd', kind: 'system' as const };
    const second = { playerId: 'a', systemId: '1:b|c', planetId: 'd', kind: 'system' as const };
    expect(planetSkinIdentityKey(first)).toBe(planetSkinIdentityKey(first));
    expect(planetSkinIdentityKey(first)).not.toBe(planetSkinIdentityKey(second));
    expect(planetSkinStorageKey(first)).not.toContain('/');
  });
});
