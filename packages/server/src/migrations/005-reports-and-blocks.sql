-- Migration 005: Reports and Chat Bans
-- Player reporting system with Gemini-moderated temporary chat bans

CREATE TABLE IF NOT EXISTS reports (
  id              SERIAL PRIMARY KEY,
  reporter_id     TEXT NOT NULL,
  reported_id     TEXT NOT NULL,
  message_id      TEXT,
  message_content TEXT NOT NULL,
  channel         TEXT NOT NULL,
  context_json    TEXT,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending|warned|blocked|severe|dismissed
  gemini_verdict  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_dedup
  ON reports(reporter_id, message_id) WHERE message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS chat_bans (
  id          SERIAL PRIMARY KEY,
  player_id   TEXT NOT NULL,
  channel     TEXT NOT NULL,           -- channel banned in, or 'all'
  banned_by   TEXT NOT NULL DEFAULT 'gemini',
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,    -- always time-limited
  UNIQUE(player_id, channel)
);
CREATE INDEX IF NOT EXISTS idx_chat_bans_active ON chat_bans(player_id, channel, expires_at);
