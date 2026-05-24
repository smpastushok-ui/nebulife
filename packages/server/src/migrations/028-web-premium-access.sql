-- Web Premium access loop.
-- Run manually in Neon SQL Editor. Do not expose migrations through API.

ALTER TABLE players ADD COLUMN IF NOT EXISTS premium_web_access_email TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS premium_web_invite_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS premium_entitlement_events (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  product_id TEXT,
  expires_at TIMESTAMPTZ,
  reference TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_premium_events_reference
  ON premium_entitlement_events(reference)
  WHERE reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_premium_events_player_created
  ON premium_entitlement_events(player_id, created_at DESC);
