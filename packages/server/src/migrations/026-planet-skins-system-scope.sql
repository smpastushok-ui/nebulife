-- Scope generated planet skins to the exact system + planet pair.
-- Planet IDs are deterministic from planet seeds and can collide across systems,
-- so planet_id alone is not globally unique.

DROP INDEX IF EXISTS idx_planet_skins_planet_kind;

CREATE UNIQUE INDEX IF NOT EXISTS idx_planet_skins_system_planet_kind
  ON planet_skins(system_id, planet_id, kind);

CREATE INDEX IF NOT EXISTS idx_planet_skins_planet
  ON planet_skins(planet_id, kind);
