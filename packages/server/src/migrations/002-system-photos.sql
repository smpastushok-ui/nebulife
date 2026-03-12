-- System Photos (telescope snapshots of star systems)
CREATE TABLE IF NOT EXISTS system_photos (
  id              TEXT PRIMARY KEY,
  player_id       TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  system_id       TEXT NOT NULL,
  photo_url       TEXT,
  kling_task_id   TEXT,
  prompt_used     TEXT,
  status          TEXT NOT NULL DEFAULT 'generating',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- Unique constraint: one photo per player per system (upsert support)
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_photos_player_system
  ON system_photos(player_id, system_id);

CREATE INDEX IF NOT EXISTS idx_system_photos_player
  ON system_photos(player_id);

-- System Missions (video fly-throughs from system photos)
CREATE TABLE IF NOT EXISTS system_missions (
  id              TEXT PRIMARY KEY,
  player_id       TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  system_id       TEXT NOT NULL,
  photo_id        TEXT REFERENCES system_photos(id) ON DELETE SET NULL,
  duration_type   TEXT NOT NULL DEFAULT 'short',
  duration_sec    INTEGER NOT NULL DEFAULT 5,
  cost_quarks     INTEGER NOT NULL DEFAULT 30,
  status          TEXT NOT NULL DEFAULT 'generating',
  kling_task_id   TEXT,
  video_url       TEXT,
  prompt_used     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_system_missions_player
  ON system_missions(player_id);
