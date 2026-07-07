-- 039-polls
-- Admin-created polls (голосування) shown as a card/banner in the global
-- community chat tab. Players vote once per poll; the client only ever
-- receives percentages (never absolute counts) — the admin console shows
-- full counts + the voter list. Run in Neon SQL Editor.

CREATE TABLE IF NOT EXISTS polls (
  id            TEXT PRIMARY KEY,
  question_uk   TEXT NOT NULL,
  question_en   TEXT NOT NULL,
  options       JSONB NOT NULL, -- array of {id, label_uk, label_en}
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closes_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_polls_status_created_at
  ON polls(status, created_at DESC);

CREATE TABLE IF NOT EXISTS poll_votes (
  id          SERIAL PRIMARY KEY,
  poll_id     TEXT NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  player_id   TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  option_id   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (poll_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll
  ON poll_votes(poll_id);
