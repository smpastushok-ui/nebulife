-- Server-side Premium entitlement cache.
-- RevenueCat remains the source of truth; these fields are the game-server
-- snapshot used by API gates so clients cannot unlock Premium by localStorage.

ALTER TABLE players ADD COLUMN IF NOT EXISTS premium_active BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS premium_expires_at TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN IF NOT EXISTS premium_product_id TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS premium_source TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS premium_updated_at TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN IF NOT EXISTS premium_daily_quarks_claimed_on DATE;

CREATE INDEX IF NOT EXISTS idx_players_premium_active
  ON players(premium_active, premium_expires_at);
