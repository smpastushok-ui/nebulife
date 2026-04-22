-- ============================================================================
-- 014-second-home-colony.sql
-- Second-home colonization social feature.
--
-- Builds on migration 013 (planet_claims table):
--   * Adds UNIQUE(cluster_id, owner_player_id) so each player can claim only
--     one planet as their second home.
--   * Adds `type` column to messages so the client can render special
--     "colony_settled" broadcast messages distinctly (small icon, click-to-
--     navigate) instead of plain text.
--
-- The feature itself — "when a player settles their second home after the
-- doomsday, cluster chat gets notified + a small marker appears on everyone's
-- star map" — reuses existing planet_claims rows with no additional state.
-- ============================================================================

-- ── One colony per player per cluster ─────────────────────────────────────
-- Wrapped in DO block because Postgres doesn't support `ADD CONSTRAINT
-- IF NOT EXISTS`. Idempotent: safe to re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'planet_claims_unique_player_per_cluster'
  ) THEN
    ALTER TABLE planet_claims
      ADD CONSTRAINT planet_claims_unique_player_per_cluster
      UNIQUE (cluster_id, owner_player_id);
  END IF;
END $$;

-- ── Chat message type column ──────────────────────────────────────────────
-- Default 'text' keeps legacy rows unchanged. New special broadcasts use
-- 'colony_settled' (more types can be added later, e.g. 'system_event').
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'text';

-- Check constraint restricts to known types (prevents typos from client).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_type_check'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_type_check
      CHECK (type IN ('text', 'colony_settled'));
  END IF;
END $$;

-- Index so we can quickly pull recent announcements per cluster.
CREATE INDEX IF NOT EXISTS idx_messages_type_channel
  ON messages(channel, type, created_at DESC)
  WHERE type <> 'text';
