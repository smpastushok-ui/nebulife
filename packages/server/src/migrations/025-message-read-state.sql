-- Cross-device chat read state
-- Stores the last message timestamp each player has seen per channel.

CREATE TABLE IF NOT EXISTS message_reads (
  player_id     TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL,
  last_read_at  TIMESTAMPTZ NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_player
  ON message_reads(player_id);
