-- Anti-repeat support for ASTRA daily quiz + daily fun-fact broadcasts.
--
-- Root cause fixed by this migration + accompanying code changes:
--   generateDailyQuiz() had ZERO history awareness (no dedup at all), and
--   generateDailyFunFact() only passed a soft "please don't repeat" text
--   hint to Gemini with no deterministic verification — both allowed exact
--   and near-duplicate content to recur. Fingerprint/key-term columns let
--   the generator reject/retry duplicates deterministically instead of
--   trusting the model's own judgement.
--
-- Backward compatible: both columns are nullable. Application code derives
-- the same fingerprint in memory from content_json for older NULL rows, so
-- the cooldown immediately covers content delivered before this migration.
-- No destructive SQL backfill is required.

ALTER TABLE daily_content ADD COLUMN IF NOT EXISTS fingerprint TEXT;
ALTER TABLE daily_content ADD COLUMN IF NOT EXISTS key_terms TEXT[];

CREATE INDEX IF NOT EXISTS idx_daily_content_type_fingerprint
  ON daily_content(content_type, fingerprint);

-- Per-player cron delivery idempotency. A single shared daily content row is
-- still generated/cached globally, while each player's actual message insert
-- gets a deterministic key. Concurrent Vercel invocations and retries can
-- therefore safely resume partial fan-out without double-delivery.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_dedupe_key
  ON messages(dedupe_key)
  WHERE dedupe_key IS NOT NULL;
