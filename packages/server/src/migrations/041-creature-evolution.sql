-- 041-creature-evolution
-- "Еволюція біосфери" — daily-care loop, growth stages and generations on
-- top of the Biosphere creatures MVP (migration 040-creature-models.sql).
-- See NEXT_GEN_PLAN.md Section C and GAME_MODULES.md (AI-контент).
-- Run manually in the Neon SQL Editor — never as an API migration endpoint.

ALTER TABLE creature_models
  ADD COLUMN IF NOT EXISTS vitality INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'juvenile', -- juvenile | adult | elder | legacy
  ADD COLUMN IF NOT EXISTS care_days INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_care_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generation INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES creature_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS traits JSONB;

-- Lineage lookups (legacy parent -> offspring chain) and "any creature
-- careable today" queries both filter on these.
CREATE INDEX IF NOT EXISTS idx_creature_models_parent
  ON creature_models(parent_id)
  WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_creature_models_stage
  ON creature_models(planet_id, stage)
  WHERE status = 'ready';
