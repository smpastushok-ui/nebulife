-- 040-creature-models
-- Biosphere creatures: player-generated GLB life settled on their planets.
-- See NEXT_GEN_PLAN.md Section C (3D-life on planets), phases 1-2 MVP.
-- Run manually in the Neon SQL Editor — never as an API migration endpoint.

CREATE TABLE IF NOT EXISTS creature_models (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  planet_id TEXT NOT NULL,
  name TEXT,
  description TEXT NOT NULL,
  prompt_used TEXT,
  image_url TEXT,
  glb_url TEXT,
  tripo_task_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued', -- queued | generating | ready | failed
  quarks_paid INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Max 3 creatures per planet is enforced in the API layer (not a DB
-- constraint), so a failed/retried generation doesn't need a transactional
-- delete-and-recreate dance.
CREATE INDEX IF NOT EXISTS idx_creature_models_planet
  ON creature_models(planet_id, player_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_creature_models_player
  ON creature_models(player_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creature_models_status
  ON creature_models(status)
  WHERE status IN ('queued', 'generating');
