-- 019-planet-skins
-- Shared Kling-generated planet texture maps.
-- kind='system' is the default shared orbit-view skin; kind='exosphere' is the paid close-view skin.

CREATE TABLE IF NOT EXISTS planet_skins (
  id              TEXT PRIMARY KEY,
  planet_id       TEXT NOT NULL,
  system_id       TEXT NOT NULL,
  kind            TEXT NOT NULL CHECK (kind IN ('system', 'exosphere')),
  status          TEXT NOT NULL DEFAULT 'generating',
  texture_url     TEXT,
  kling_task_id   TEXT,
  prompt_used     TEXT,
  generated_by    TEXT REFERENCES players(id) ON DELETE SET NULL,
  quarks_paid     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_planet_skins_planet_kind
  ON planet_skins(planet_id, kind);

CREATE INDEX IF NOT EXISTS idx_planet_skins_system
  ON planet_skins(system_id, kind);

CREATE INDEX IF NOT EXISTS idx_planet_skins_status
  ON planet_skins(status)
  WHERE status IN ('generating', 'pending', 'processing');

