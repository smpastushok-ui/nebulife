-- 038-player-feedback
-- Open, unprompted feedback collected from players who have reached level 12+
-- (client-gated one-shot popup: "what do you like / dislike about the game").
-- Read-only in the admin console — no reply/edit workflow, just a triage feed.

CREATE TABLE IF NOT EXISTS player_feedback (
  id              SERIAL PRIMARY KEY,
  player_id       TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  callsign        TEXT,
  level           INTEGER NOT NULL DEFAULT 0,
  likes_text      TEXT,
  dislikes_text   TEXT,
  language        TEXT NOT NULL DEFAULT 'uk',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_feedback_created_at
  ON player_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_player_feedback_player
  ON player_feedback(player_id);
