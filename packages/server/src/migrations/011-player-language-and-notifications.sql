-- Player preferred language and notification preferences
ALTER TABLE players ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'uk';
ALTER TABLE players ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS fcm_token TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_digest_seen TEXT;

-- Track email/push sending for digest
ALTER TABLE weekly_digest ADD COLUMN IF NOT EXISTS emails_sent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE weekly_digest ADD COLUMN IF NOT EXISTS pushes_sent BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for email notification queries (only players with email + notifications enabled)
CREATE INDEX IF NOT EXISTS idx_players_email_notif
  ON players(preferred_language) WHERE email IS NOT NULL AND email_notifications = TRUE;

-- Index for push notification queries (only players with FCM token + notifications enabled)
CREATE INDEX IF NOT EXISTS idx_players_push_notif
  ON players(preferred_language) WHERE fcm_token IS NOT NULL AND push_notifications = TRUE;
