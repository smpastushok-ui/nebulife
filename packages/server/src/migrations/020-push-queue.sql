-- DB-backed push queue for reliable FCM delivery.
-- Gameplay APIs enqueue rows; cron workers send them asynchronously.

CREATE TABLE IF NOT EXISTS push_queue (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title_uk TEXT NOT NULL,
  body_uk TEXT NOT NULL,
  title_en TEXT NOT NULL,
  body_en TEXT NOT NULL, 
  data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  priority INT NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  dedupe_key TEXT,
  last_error TEXT,
  locked_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_queue_dedupe_key
  ON push_queue(dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_push_queue_pending_pickup
  ON push_queue(priority DESC, scheduled_at ASC, created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_push_queue_player_status
  ON push_queue(player_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_queue_sending_stale
  ON push_queue(locked_at)
  WHERE status = 'sending';
