-- ---------------------------------------------------------------------------
-- 036 — Cosmic events (backend-authored upcoming astronomical events)
-- ---------------------------------------------------------------------------
-- Run in Neon SQL Editor.
--
-- Replaces the on-screen comet countdown chip: events are now authored here and
-- surfaced read-only to the orbital telescope / observatory. Title is bilingual;
-- imagery is optional (photo first, video may follow).

CREATE TABLE IF NOT EXISTS cosmic_events (
  id BIGSERIAL PRIMARY KEY,
  title_uk TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_uk TEXT,
  description_en TEXT,
  event_time TIMESTAMPTZ NOT NULL,
  photo_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast "next upcoming events" lookup.
CREATE INDEX IF NOT EXISTS idx_cosmic_events_time ON cosmic_events(event_time);

-- Example seed (safe to delete):
-- INSERT INTO cosmic_events (title_uk, title_en, description_uk, description_en, event_time, photo_url)
-- VALUES ('Проходження комети', 'Comet Flyby', 'Яскрава комета перетне систему.', 'A bright comet crosses the system.',
--         NOW() + INTERVAL '2 days', NULL);
