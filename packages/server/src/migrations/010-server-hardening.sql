-- Distributed rate limiter
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count INTEGER NOT NULL DEFAULT 1,
  window_ms INTEGER NOT NULL
);

-- Idempotency keys (prevent duplicate payments/generations)
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  response_status INTEGER,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_idempotency_created ON idempotency_keys (created_at);

-- Ad session anti-replay tokens
CREATE TABLE IF NOT EXISTS used_ad_sessions (
  session_id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_sessions_used_at ON used_ad_sessions (used_at);
