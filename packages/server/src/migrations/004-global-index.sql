-- Add global_index for universe group assignment (one per player, sequential)
CREATE SEQUENCE IF NOT EXISTS player_global_index_seq;
ALTER TABLE players ADD COLUMN IF NOT EXISTS global_index INTEGER;

-- Backfill existing players by registration order (0-based)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) - 1 AS rn
  FROM players WHERE global_index IS NULL
)
UPDATE players SET global_index = numbered.rn
FROM numbered WHERE players.id = numbered.id;

-- Set sequence to continue after existing players
SELECT setval('player_global_index_seq', COALESCE((SELECT MAX(global_index) FROM players), -1) + 1, false);

-- Set DEFAULT so new inserts automatically get next index
ALTER TABLE players ALTER COLUMN global_index SET DEFAULT nextval('player_global_index_seq');

-- Unique index on global_index
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_global_index
  ON players(global_index) WHERE global_index IS NOT NULL;
