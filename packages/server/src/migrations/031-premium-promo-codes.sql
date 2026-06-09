-- 031: Premium promo codes (one-time codes for testers / partners).
-- Run in Neon SQL Editor.

CREATE TABLE IF NOT EXISTS premium_promo_codes (
  code           TEXT PRIMARY KEY,            -- normalized: uppercase, no spaces/dashes
  duration_days  INTEGER NOT NULL DEFAULT 365,
  note           TEXT,                        -- who/what the code is for (e.g. 'tester batch 1')
  expires_at     TIMESTAMPTZ,                 -- code redemption deadline (NULL = no deadline)
  redeemed_by    TEXT,                        -- player id; NULL = unused (one-time use)
  redeemed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_premium_promo_codes_redeemed_by
  ON premium_promo_codes (redeemed_by) WHERE redeemed_by IS NOT NULL;

-- ============================================================
-- Code generation: 20 one-time codes for 1 year of premium.
-- Format: NEBU-XXXX-XXXX (unambiguous alphabet, no 0/O/1/I).
-- Codes are stored WITHOUT dashes; the API strips dashes/spaces
-- and uppercases input, so testers can type either form.
-- Run this block whenever you need a new batch; then:
--   SELECT code, note FROM premium_promo_codes WHERE redeemed_by IS NULL;
-- and format for sharing as NEBU-XXXX-XXXX.
-- ============================================================
INSERT INTO premium_promo_codes (code, duration_days, note, expires_at)
SELECT
  'NEBU' || string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1),
    '' ORDER BY i
  ),
  365,
  'tester batch ' || to_char(NOW(), 'YYYY-MM-DD'),
  NOW() + INTERVAL '180 days'   -- redemption deadline; premium itself lasts 365 days from redemption
FROM generate_series(1, 20) AS batch(n)
CROSS JOIN generate_series(1, 8) AS chars(i)
GROUP BY batch.n
ON CONFLICT (code) DO NOTHING;

-- View generated codes in shareable format:
-- SELECT
--   substr(code, 1, 4) || '-' || substr(code, 5, 4) || '-' || substr(code, 9, 4) AS share_code,
--   note, expires_at
-- FROM premium_promo_codes
-- WHERE redeemed_by IS NULL
-- ORDER BY created_at DESC;
