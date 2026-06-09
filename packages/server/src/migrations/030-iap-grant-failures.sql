-- IAP quark-grant failures — durable record for store-charged purchases that
-- did NOT credit quarks (the dangerous case: player paid Apple/Google but our
-- /api/iap/grant rejected/failed). Lets us find and manually compensate them.
-- Not FK-bound on player_id: a failure can carry a mismatched/unknown id.
CREATE TABLE IF NOT EXISTS iap_grant_failures (
  id             TEXT PRIMARY KEY,
  player_id      TEXT,
  product_id     TEXT,
  quarks         INTEGER,
  purchase_token TEXT,
  reason         TEXT NOT NULL,   -- credit_failed | unknown_product | player_not_found | amount_mismatch | player_mismatch | missing_fields
  status         INTEGER NOT NULL, -- HTTP status we returned to the client
  detail         TEXT,             -- error message / context
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iap_failures_created
  ON iap_grant_failures(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_iap_failures_player
  ON iap_grant_failures(player_id, created_at DESC);
