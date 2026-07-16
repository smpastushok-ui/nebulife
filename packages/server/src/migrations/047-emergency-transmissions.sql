-- Backend-owned Emergency Transmission catalog and per-player exact-once claims.
-- Apply manually in Neon SQL Editor after 046-daily-content-fingerprint.sql.

CREATE TABLE IF NOT EXISTS emergency_transmission_episodes (
  id TEXT PRIMARY KEY,
  youtube_id TEXT NOT NULL,
  title_uk TEXT NOT NULL,
  title_en TEXT NOT NULL,
  summary_uk TEXT NOT NULL,
  summary_en TEXT NOT NULL,
  release_at TIMESTAMPTZ NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT emergency_transmission_id_format
    CHECK (id ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  CONSTRAINT emergency_transmission_youtube_id_format
    CHECK (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  CONSTRAINT emergency_transmission_title_uk_nonempty CHECK (length(btrim(title_uk)) > 0),
  CONSTRAINT emergency_transmission_title_en_nonempty CHECK (length(btrim(title_en)) > 0),
  CONSTRAINT emergency_transmission_summary_uk_nonempty CHECK (length(btrim(summary_uk)) > 0),
  CONSTRAINT emergency_transmission_summary_en_nonempty CHECK (length(btrim(summary_en)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_emergency_transmission_release_order
  ON emergency_transmission_episodes(release_at ASC, sort_order ASC, id ASC)
  WHERE enabled = TRUE AND published = TRUE AND archived_at IS NULL;

CREATE TABLE IF NOT EXISTS emergency_transmission_claims (
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  episode_id TEXT NOT NULL REFERENCES emergency_transmission_episodes(id) ON DELETE RESTRICT,
  claim_token UUID,
  claim_source TEXT NOT NULL DEFAULT 'display',
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  PRIMARY KEY (player_id, episode_id),
  CONSTRAINT emergency_transmission_claim_source
    CHECK (claim_source IN ('display', 'legacy_sync'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_emergency_transmission_claim_token
  ON emergency_transmission_claims(player_id, claim_token)
  WHERE claim_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_emergency_transmission_claims_episode
  ON emergency_transmission_claims(episode_id, claimed_at);

INSERT INTO emergency_transmission_episodes (
  id,
  youtube_id,
  title_uk,
  title_en,
  summary_uk,
  summary_en,
  release_at,
  sort_order,
  enabled,
  published
) VALUES (
  'frontier-dispatch-001',
  'Keu09e2e0I4',
  'Прикордонне включення 001',
  'Frontier dispatch 001',
  'Короткий польовий звіт від науково-військової місії за межами безпечного коридору.',
  'A short field report from a science-military mission operating beyond the safe corridor.',
  '2026-06-23T00:00:00.000Z',
  10,
  TRUE,
  TRUE
)
ON CONFLICT (id) DO NOTHING;
