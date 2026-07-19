export type PlanetSkinIdentityKind = 'system' | 'exosphere';

export interface PlanetSkinIdentity {
  playerId: string;
  systemId: string;
  planetId: string;
  kind: PlanetSkinIdentityKind;
}

function encodeIdentityPart(value: string): string {
  return `${value.length}:${value}`;
}

/**
 * Canonical, collision-safe identity for a player-owned planet skin.
 * Length-prefixing keeps arbitrary IDs unambiguous without relying on a
 * delimiter that may later become valid inside an ID.
 */
export function planetSkinIdentityKey(identity: PlanetSkinIdentity): string {
  return [
    'planet-skin:v1',
    encodeIdentityPart(identity.playerId),
    encodeIdentityPart(identity.systemId),
    encodeIdentityPart(identity.planetId),
    encodeIdentityPart(identity.kind),
  ].join('|');
}

/** URL/path-safe deterministic representation of the canonical identity. */
export function planetSkinStorageKey(identity: PlanetSkinIdentity): string {
  return encodeURIComponent(planetSkinIdentityKey(identity));
}
