-- Lifeforms (Genesis module) — discovered or created alien lifeforms.
-- A lifeform can be "found" (chance on building placement) or "created"
-- (Genesis Lab, phase 2). Common lifeforms use bundled assets (is_bundle).
-- Uncommon and rarer get unique paid Kling Alpha-photo (4K) and Alpha-video.
CREATE TABLE IF NOT EXISTS lifeforms (
  id              TEXT PRIMARY KEY,
  player_id       TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  system_id       TEXT,
  planet_id       TEXT,
  source          TEXT NOT NULL DEFAULT 'found',   -- 'found' | 'created'
  rarity          TEXT NOT NULL DEFAULT 'common',  -- common | uncommon | rare | epic | legendary
  species_name    TEXT,
  is_bundle       BOOLEAN NOT NULL DEFAULT FALSE,   -- common lifeforms shipped in the app bundle

  -- Alpha-photo (Kling v3 omni, up to 4K)
  photo_url       TEXT,
  photo_status    TEXT,                             -- NULL | generating | succeed | failed
  photo_task_id   TEXT,

  -- Alpha-video (Kling image-to-video, derived from photo)
  video_url       TEXT,
  video_status    TEXT,                             -- NULL | generating | succeed | failed
  video_task_id   TEXT,

  prompt_used     TEXT,
  quarks_paid     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lifeforms_player
  ON lifeforms(player_id);
