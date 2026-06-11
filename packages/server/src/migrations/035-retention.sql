-- ---------------------------------------------------------------------------
-- 035 — Retention systems: daily directives, cluster rating, comet event
-- ---------------------------------------------------------------------------
-- Run in Neon SQL Editor.

-- Daily directives (3 tasks/day, quark claim + 7-day streak)
ALTER TABLE players ADD COLUMN IF NOT EXISTS directive_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_directive_date DATE;

-- Weekly XP window for cluster rating.
-- week_xp_base = player_xp snapshot at the start of week `week_xp_base_week`
-- (Monday YYYY-MM-DD UTC). weekly XP = player_xp - week_xp_base.
ALTER TABLE players ADD COLUMN IF NOT EXISTS week_xp_base INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS week_xp_base_week TEXT;

-- Permanent champion achievements counter
ALTER TABLE players ADD COLUMN IF NOT EXISTS champion_weeks INTEGER NOT NULL DEFAULT 0;

-- Weekly winners: 1 row per cluster per finished week; top-10 get global_rank.
CREATE TABLE IF NOT EXISTS cluster_champions (
  id BIGSERIAL PRIMARY KEY,
  week_date TEXT NOT NULL,                 -- Monday (UTC) of the finished week
  cluster_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  weekly_xp INTEGER NOT NULL,
  global_rank INTEGER,                     -- 1..10 among all champions, NULL otherwise
  reward_quarks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (week_date, cluster_id)
);

CREATE INDEX IF NOT EXISTS idx_cluster_champions_week ON cluster_champions(week_date);
CREATE INDEX IF NOT EXISTS idx_cluster_champions_player ON cluster_champions(player_id);
CREATE INDEX IF NOT EXISTS idx_players_cluster_xp ON players(cluster_id, player_xp DESC);
