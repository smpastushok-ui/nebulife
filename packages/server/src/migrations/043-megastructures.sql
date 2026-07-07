-- 043-megastructures
-- "Мегаструктури кластера" — collective, weeks-long construction project
-- shared by all 50 players of a cluster. One active megastructure per
-- cluster; MVP only ever provisions the "Галактичний маяк" (Galactic
-- Beacon), type='beacon', tier=1. `type`/`tier` are kept open-ended so a
-- future tier-2 structure can slot in without another schema change.
-- Sizing math lives in packages/core/src/game/megastructure.ts.
-- See GAME_MODULES.md (Соціальне та спільнота, "Мегаструктури кластера").
-- Run manually in the Neon SQL Editor — never as an API migration endpoint.

CREATE TABLE IF NOT EXISTS megastructures (
  id                     TEXT PRIMARY KEY,
  cluster_id             TEXT NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  type                   TEXT NOT NULL DEFAULT 'beacon',
  tier                   INTEGER NOT NULL DEFAULT 1,
  status                 TEXT NOT NULL DEFAULT 'building' CHECK (status IN ('building', 'completed')),
  requirements           JSONB NOT NULL, -- {minerals, volatiles, isotopes, water}
  progress               JSONB NOT NULL DEFAULT '{"minerals":0,"volatiles":0,"isotopes":0,"water":0}',
  research_bonus_active  BOOLEAN NOT NULL DEFAULT FALSE, -- +5% research speed for the cluster (see App.tsx)
  builders               JSONB, -- eternal "Будівничі" record, filled once on completion
  started_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at           TIMESTAMPTZ
);

-- Lookup of the current (most recently started) structure for a cluster.
CREATE INDEX IF NOT EXISTS idx_megastructures_cluster
  ON megastructures(cluster_id, started_at DESC);

CREATE TABLE IF NOT EXISTS megastructure_contributions (
  id                SERIAL PRIMARY KEY,
  megastructure_id  TEXT NOT NULL REFERENCES megastructures(id) ON DELETE CASCADE,
  player_id         TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_name       TEXT NOT NULL,
  -- Cumulative amounts contributed by this player on this day (upserted as
  -- the running total, not one row per contribute call) — this is what
  -- makes the daily-cap check a single indexed lookup.
  resources         JSONB NOT NULL DEFAULT '{"minerals":0,"volatiles":0,"isotopes":0,"water":0}',
  day               DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (megastructure_id, player_id, day)
);

CREATE INDEX IF NOT EXISTS idx_megastructure_contributions_structure
  ON megastructure_contributions(megastructure_id);

CREATE INDEX IF NOT EXISTS idx_megastructure_contributions_player
  ON megastructure_contributions(megastructure_id, player_id);
