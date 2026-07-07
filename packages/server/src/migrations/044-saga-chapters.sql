-- 044-saga-chapters
-- "Сага Ткача" — personal AI-written illustrated chronicle. Each row is one
-- milestone chapter: Gemini text narration (in-universe voice of Ткач, the
-- Weaver) + one Gemini illustration, written once per player per milestone
-- type. See GAME_MODULES.md (AI-контент, "Сага Ткача" row).
-- Run manually in the Neon SQL Editor — never as an API migration endpoint.

CREATE TABLE IF NOT EXISTS saga_chapters (
  id             TEXT PRIMARY KEY,
  player_id      TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL,
  title          TEXT NOT NULL,
  body_text      TEXT NOT NULL,
  image_url      TEXT,
  language       TEXT NOT NULL DEFAULT 'uk',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, milestone_type)
);

-- Reader chapter list (chronological) and the once-per-milestone check both
-- filter on player_id; created_at DESC serves the reader's default order.
CREATE INDEX IF NOT EXISTS idx_saga_chapters_player
  ON saga_chapters(player_id, created_at DESC);

-- Server-side daily generation cap (SAGA_DAILY_CHAPTER_CAP in
-- packages/core/src/game/saga.ts) — "any chapter written by this player in
-- the last 24h" check scans this same index.
