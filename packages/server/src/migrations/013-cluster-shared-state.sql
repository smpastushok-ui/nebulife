-- ============================================================================
-- 013-cluster-shared-state.sql
-- Cluster-wide shared multiplayer state.
--
-- BEFORE this migration, every player saw a fully isolated universe — even
-- though procedural generation guaranteed identical zoo of stars/planets,
-- gameplay state (colonies, destroyed planets, terraform) lived only in each
-- player's own game_state JSONB. Result: when player A visited a system that
-- player B had colonized, A saw the planet as untouched.
--
-- AFTER this migration:
--   * planet_claims        — cluster-wide colonization & terraform progress
--   * planet_destructions  — cluster-wide planet destruction events
--   * player_presence      — heartbeat / online status (5-min freshness)
--
-- Per-player overrides (planet/system aliases / nicknames) intentionally STAY
-- in client localStorage — other players always see procedurally-generated
-- names. Only the OBJECTIVE state of the universe is shared.
--
-- All tables include cluster_id so we can scope queries to one cluster of 50
-- players (and so we don't leak state between clusters).
-- ============================================================================

-- ── planet_claims: cluster-wide colonization registry ─────────────────────
-- Each row is a planet that some player has colonized in this cluster.
-- Composite key (cluster_id, system_id, planet_id) prevents two players from
-- colonizing the same planet. Updated when colonization succeeds; deleted
-- when colony is abandoned.
CREATE TABLE IF NOT EXISTS planet_claims (
  cluster_id        TEXT      NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  system_id         TEXT      NOT NULL,
  planet_id         TEXT      NOT NULL,
  owner_player_id   TEXT      NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  claimed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Optional progressive state (populated as gameplay matures)
  colony_level      INTEGER   NOT NULL DEFAULT 1,
  terraform_pct     REAL      NOT NULL DEFAULT 0,    -- 0..1
  -- Display-only metadata
  owner_name_snapshot TEXT,                          -- denormalized for fast list
  PRIMARY KEY (cluster_id, system_id, planet_id)
);

CREATE INDEX IF NOT EXISTS idx_planet_claims_owner
  ON planet_claims(owner_player_id);
CREATE INDEX IF NOT EXISTS idx_planet_claims_cluster_system
  ON planet_claims(cluster_id, system_id);

-- ── planet_destructions: cluster-wide destruction events ──────────────────
-- Each row is a planet that has been destroyed (e.g. doomsday weapon, kinetic
-- impactor). Visible to all cluster members when they visit the system.
CREATE TABLE IF NOT EXISTS planet_destructions (
  cluster_id          TEXT      NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  system_id           TEXT      NOT NULL,
  planet_id           TEXT      NOT NULL,
  destroyed_by_player_id TEXT   NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  destroyed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  orbit_au            REAL,                         -- preserved for visualization
  reason              TEXT,                         -- 'doomsday' / 'impactor' / etc.
  PRIMARY KEY (cluster_id, system_id, planet_id)
);

CREATE INDEX IF NOT EXISTS idx_planet_destructions_cluster_system
  ON planet_destructions(cluster_id, system_id);

-- ── player_presence: heartbeat / online status ────────────────────────────
-- Lightweight per-player row updated every ~30s by the client. Players whose
-- last_heartbeat is < 5 min ago are considered "online".
CREATE TABLE IF NOT EXISTS player_presence (
  player_id        TEXT      PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  cluster_id       TEXT      REFERENCES clusters(id) ON DELETE SET NULL,
  last_heartbeat   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_scene    TEXT,                            -- 'galaxy' / 'system' / etc.
  current_system_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_player_presence_cluster_recent
  ON player_presence(cluster_id, last_heartbeat DESC);

-- ── Helper view: online cluster members ───────────────────────────────────
-- Players whose heartbeat is within the last 5 minutes.
CREATE OR REPLACE VIEW v_cluster_online_members AS
SELECT
  pp.player_id,
  pp.cluster_id,
  pp.last_heartbeat,
  pp.current_scene,
  pp.current_system_id,
  p.name AS player_name,
  p.global_index
FROM player_presence pp
JOIN players p ON p.id = pp.player_id
WHERE pp.last_heartbeat > NOW() - INTERVAL '5 minutes';
