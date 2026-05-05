-- Aggregated play-time history for adaptive reminder scheduling.
-- Stores one compact row per player/day/hour instead of raw session events.

CREATE TABLE IF NOT EXISTS player_activity_hours (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  hour_utc INT NOT NULL CHECK (hour_utc >= 0 AND hour_utc <= 23),
  hits INT NOT NULL DEFAULT 0,
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, activity_date, hour_utc)
);

CREATE INDEX IF NOT EXISTS idx_player_activity_hours_recent
  ON player_activity_hours(player_id, activity_date DESC, hits DESC);
