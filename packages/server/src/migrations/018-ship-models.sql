-- 018-ship-models
-- Player-owned custom arena ships generated through the ship design pipeline.

CREATE TABLE IF NOT EXISTS ship_models (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  prompt TEXT NOT NULL,
  prompt_used TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'pending',
  moderation_reason TEXT,
  kling_task_id TEXT,
  concept_url TEXT,
  tripo_task_id TEXT,
  glb_url TEXT,
  quarks_paid INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ship_models_player
  ON ship_models(player_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ship_models_status
  ON ship_models(status)
  WHERE status IN ('pending', 'generating_concept', 'generating_3d', 'running');
