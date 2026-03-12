-- System Photos (telescope photos of star systems)
CREATE TABLE IF NOT EXISTS system_photos (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  system_id TEXT NOT NULL,
  photo_url TEXT,
  kling_task_id TEXT,
  prompt_used TEXT,
  status TEXT NOT NULL DEFAULT 'generating',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(player_id, system_id)
);

CREATE INDEX IF NOT EXISTS idx_system_photos_player ON system_photos(player_id);

-- System Missions (video missions from system photos)
CREATE TABLE IF NOT EXISTS system_missions (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  system_id TEXT NOT NULL,
  photo_id TEXT REFERENCES system_photos(id),
  duration_type TEXT NOT NULL,
  duration_sec INTEGER NOT NULL,
  cost_quarks INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'generating',
  kling_task_id TEXT,
  video_url TEXT,
  prompt_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_system_missions_player ON system_missions(player_id);
CREATE INDEX IF NOT EXISTS idx_system_missions_system ON system_missions(player_id, system_id);
