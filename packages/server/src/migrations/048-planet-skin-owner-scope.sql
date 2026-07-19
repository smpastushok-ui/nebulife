-- 048-planet-skin-owner-scope
-- Planet skins are paid, player-owned artifacts. Scope every record to
-- player + system + planet + kind while preserving legacy rows.
--
-- Deployment order: run this migration in Neon SQL Editor before deploying
-- the matching server/client code.

ALTER TABLE planet_skins
  ADD COLUMN IF NOT EXISTS owner_player_id TEXT REFERENCES players(id) ON DELETE CASCADE;

-- Existing rows already recorded their purchaser in generated_by.
UPDATE planet_skins
SET owner_player_id = generated_by
WHERE owner_player_id IS NULL
  AND generated_by IS NOT NULL;

-- Recover old home-planet rows whose generated_by was lost.
UPDATE planet_skins ps
SET owner_player_id = p.id
FROM players p
WHERE ps.owner_player_id IS NULL
  AND ps.system_id = p.home_system_id
  AND ps.planet_id = p.home_planet_id;

DROP INDEX IF EXISTS idx_planet_skins_system_planet_kind;

CREATE UNIQUE INDEX IF NOT EXISTS idx_planet_skins_owner_system_planet_kind
  ON planet_skins(owner_player_id, system_id, planet_id, kind)
  WHERE owner_player_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_planet_skins_unresolved_legacy
  ON planet_skins(system_id, planet_id, kind)
  WHERE owner_player_id IS NULL;

-- Audit after migration. Rows returned here remain preserved but quarantined:
-- they cannot safely be exposed until an owner is assigned manually.
SELECT id, system_id, planet_id, kind, created_at
FROM planet_skins
WHERE owner_player_id IS NULL
ORDER BY created_at;
