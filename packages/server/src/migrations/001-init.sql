-- Nebulife: Initial Schema
-- Neon PostgreSQL (serverless)

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  home_system_id  TEXT NOT NULL,
  home_planet_id  TEXT NOT NULL,
  game_phase      TEXT NOT NULL DEFAULT 'exploring',
  science_points  INTEGER NOT NULL DEFAULT 0,
  login_streak    INTEGER NOT NULL DEFAULT 0,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  game_state      JSONB NOT NULL DEFAULT '{}'
);

-- Discoveries table
CREATE TABLE IF NOT EXISTS discoveries (
  id                TEXT PRIMARY KEY,
  player_id         TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  object_type       TEXT NOT NULL,
  rarity            TEXT NOT NULL,
  gallery_category  TEXT NOT NULL,
  system_id         TEXT NOT NULL,
  planet_id         TEXT,
  photo_url         TEXT,
  prompt_used       TEXT,
  scientific_report TEXT,
  discovered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expeditions table
CREATE TABLE IF NOT EXISTS expeditions (
  id            TEXT PRIMARY KEY,
  player_id     TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  planet_id     TEXT NOT NULL,
  system_id     TEXT NOT NULL,
  type          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'in-progress',
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms   INTEGER NOT NULL,
  completed_at  TIMESTAMPTZ
);

-- Kling AI generation tasks
CREATE TABLE IF NOT EXISTS kling_tasks (
  task_id       TEXT PRIMARY KEY,
  player_id     TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  discovery_id  TEXT REFERENCES discoveries(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  image_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_discoveries_player ON discoveries(player_id);
CREATE INDEX IF NOT EXISTS idx_discoveries_gallery ON discoveries(player_id, gallery_category);
CREATE INDEX IF NOT EXISTS idx_expeditions_player ON expeditions(player_id, status);
CREATE INDEX IF NOT EXISTS idx_kling_tasks_pending ON kling_tasks(status) WHERE status NOT IN ('succeed', 'failed');
