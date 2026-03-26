-- Clusters: player groups of 50 sharing 500 core systems
-- Core systems are generated deterministically from group_seed (no DB storage needed).
-- This table tracks which cluster exists and how many players are in it.

CREATE TABLE IF NOT EXISTS clusters (
  id              TEXT PRIMARY KEY,             -- 'cluster_<groupIndex>'
  group_index     INTEGER NOT NULL UNIQUE,
  center_x        DOUBLE PRECISION NOT NULL,
  center_y        DOUBLE PRECISION NOT NULL,
  center_z        DOUBLE PRECISION NOT NULL,
  player_count    INTEGER NOT NULL DEFAULT 0,
  is_full         BOOLEAN NOT NULL DEFAULT false,
  group_seed      BIGINT NOT NULL,             -- deterministic seed for core generation
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup for finding clusters with open slots
CREATE INDEX IF NOT EXISTS idx_clusters_available
  ON clusters(is_full, player_count) WHERE is_full = false;

-- Link players to clusters (adds cluster_id column to players)
ALTER TABLE players ADD COLUMN IF NOT EXISTS cluster_id TEXT REFERENCES clusters(id);

CREATE INDEX IF NOT EXISTS idx_players_cluster
  ON players(cluster_id) WHERE cluster_id IS NOT NULL;

-- Backfill: assign existing players to clusters based on their global_index
-- This CTE computes group assignments and creates clusters + links in one go.
-- Step 1: Create cluster rows for all groups that have players
INSERT INTO clusters (id, group_index, center_x, center_y, center_z, player_count, is_full, group_seed)
SELECT
  'cluster_' || (global_index / 50),
  global_index / 50,
  0,   -- center positions will be recomputed by application on first access
  0,
  0,
  COUNT(*)::int,
  COUNT(*) >= 50,
  0    -- seed will be recomputed by application on first access
FROM players
WHERE global_index IS NOT NULL
GROUP BY global_index / 50
ON CONFLICT (id) DO UPDATE SET
  player_count = EXCLUDED.player_count,
  is_full = EXCLUDED.is_full;

-- Step 2: Link players to their clusters
UPDATE players
SET cluster_id = 'cluster_' || (global_index / 50)
WHERE global_index IS NOT NULL AND cluster_id IS NULL;
