-- 024-player-progress-snapshot
-- Server-maintained snapshot for analytics and operational dashboards.
-- Gameplay truth remains game_state.xp + progression helpers; these columns
-- make level distribution and active-player queries cheap and simple.

ALTER TABLE players ADD COLUMN IF NOT EXISTS player_xp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS player_level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

WITH player_progress AS (
  SELECT
    p.id,
    GREATEST(
      0,
      COALESCE(
        CASE
          WHEN jsonb_typeof(p.game_state->'xp') IN ('number', 'string')
            AND (p.game_state->>'xp') ~ '^[0-9]+$'
          THEN (p.game_state->>'xp')::INTEGER
        END,
        p.player_xp,
        0
      )
    ) AS resolved_xp,
    CASE
      WHEN jsonb_typeof(p.game_state->'level') IN ('number', 'string')
        AND (p.game_state->>'level') ~ '^[0-9]+$'
      THEN GREATEST(1, LEAST(99, (p.game_state->>'level')::INTEGER))
    END AS stored_level
  FROM players p
),
computed_progress AS (
  SELECT
    pp.id,
    pp.resolved_xp,
    COALESCE(
      pp.stored_level,
      (
        SELECT GREATEST(1, COALESCE(MAX(level), 1))
        FROM (
          SELECT
            lvl AS level,
            COALESCE(SUM(FLOOR(75 * POWER(step, 1.22))) OVER (ORDER BY lvl), 0) AS required_xp
          FROM generate_series(1, 99) AS lvl
          LEFT JOIN LATERAL generate_series(2, lvl) AS step ON lvl >= 2
        ) curve
        WHERE curve.required_xp <= pp.resolved_xp
      ),
      1
    ) AS resolved_level
  FROM player_progress pp
)
UPDATE players p
SET player_xp = cp.resolved_xp,
    player_level = cp.resolved_level,
    last_seen_at = COALESCE(p.last_login, p.created_at)
FROM computed_progress cp
WHERE p.id = cp.id;

CREATE INDEX IF NOT EXISTS idx_players_player_level ON players(player_level);
CREATE INDEX IF NOT EXISTS idx_players_last_seen_at ON players(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_players_level_last_seen ON players(player_level, last_seen_at DESC);
