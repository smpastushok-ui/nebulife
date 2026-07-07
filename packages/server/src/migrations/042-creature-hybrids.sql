-- 042-creature-hybrids
-- "Дослід схрещування" — hybridization of two same-planet creatures on top of
-- the evolution module (migration 041-creature-evolution.sql). A hybrid is a
-- regular creature_models row with a second parent link; the photo-only tier
-- lives in the same row with status 'photo_ready' until (optionally) upgraded
-- to a full 3D biosphere creature.
-- See GAME_MODULES.md (AI-контент, "Еволюція біосфери" row).
-- Run manually in the Neon SQL Editor — never as an API migration endpoint.

ALTER TABLE creature_models
  ADD COLUMN IF NOT EXISTS parent_b_id TEXT REFERENCES creature_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_hybrid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hybrid_photo_url TEXT;

-- Second-parent lineage lookups (hybrid rows shown under BOTH parents).
CREATE INDEX IF NOT EXISTS idx_creature_models_parent_b
  ON creature_models(parent_b_id)
  WHERE parent_b_id IS NOT NULL;
