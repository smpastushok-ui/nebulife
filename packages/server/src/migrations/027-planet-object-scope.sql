-- Scope surface/persisted planet records to exact system + planet pairs.
-- `planet_id` is deterministic from a planet seed and can repeat in another system.

ALTER TABLE IF EXISTS surface_buildings
  ADD COLUMN IF NOT EXISTS system_id TEXT;

UPDATE surface_buildings sb
SET system_id = p.home_system_id
FROM players p
WHERE sb.player_id = p.id
  AND sb.planet_id = p.home_planet_id
  AND sb.system_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_surface_buildings_player_system_planet
  ON surface_buildings(player_id, system_id, planet_id)
  WHERE system_id IS NOT NULL;

ALTER TABLE IF EXISTS surface_state
  ADD COLUMN IF NOT EXISTS system_id TEXT;

UPDATE surface_state ss
SET system_id = p.home_system_id
FROM players p
WHERE ss.player_id = p.id
  AND ss.planet_id = p.home_planet_id
  AND ss.system_id IS NULL;

DO $$
DECLARE
  pk_name TEXT;
BEGIN
  SELECT conname INTO pk_name
  FROM pg_constraint
  WHERE conrelid = 'surface_state'::regclass
    AND contype = 'p';

  IF pk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE surface_state DROP CONSTRAINT %I', pk_name);
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_surface_state_player_system_planet
  ON surface_state(player_id, system_id, planet_id)
  WHERE system_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_surface_state_player_planet_legacy
  ON surface_state(player_id, planet_id)
  WHERE system_id IS NULL;

ALTER TABLE IF EXISTS surface_maps
  ADD COLUMN IF NOT EXISTS system_id TEXT;

UPDATE surface_maps sm
SET system_id = p.home_system_id
FROM players p
WHERE sm.player_id = p.id
  AND sm.planet_id = p.home_planet_id
  AND sm.system_id IS NULL;

DROP INDEX IF EXISTS idx_surface_maps_planet;
DROP INDEX IF EXISTS idx_surface_maps_system_planet;

CREATE UNIQUE INDEX IF NOT EXISTS idx_surface_maps_system_planet
  ON surface_maps(system_id, planet_id)
  WHERE system_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_surface_maps_planet_legacy
  ON surface_maps(planet_id)
  WHERE system_id IS NULL;
