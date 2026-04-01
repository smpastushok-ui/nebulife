-- 012-language
-- Add language preference to players and academy_lessons cache

ALTER TABLE players ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'uk';

ALTER TABLE academy_lessons ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'uk';
DROP INDEX IF EXISTS academy_lessons_lesson_date_topic_id_difficulty_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_academy_lessons_unique
  ON academy_lessons(lesson_date, topic_id, difficulty, language);
