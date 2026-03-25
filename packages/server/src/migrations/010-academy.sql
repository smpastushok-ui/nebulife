-- Academy: education quest system tables

CREATE TABLE IF NOT EXISTS academy_progress (
  id                    SERIAL PRIMARY KEY,
  player_id             TEXT NOT NULL,
  difficulty            TEXT NOT NULL DEFAULT 'explorer',
  selected_topics       TEXT[] NOT NULL DEFAULT '{}',
  completed_lessons     JSONB NOT NULL DEFAULT '{}',
  active_quest          JSONB,
  quest_streak          INTEGER NOT NULL DEFAULT 0,
  longest_streak        INTEGER NOT NULL DEFAULT 0,
  last_quest_date       DATE,
  total_quests_completed INTEGER NOT NULL DEFAULT 0,
  total_quizzes_correct  INTEGER NOT NULL DEFAULT 0,
  total_quizzes_answered INTEGER NOT NULL DEFAULT 0,
  category_progress     JSONB NOT NULL DEFAULT '{}',
  onboarded             BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id)
);

CREATE TABLE IF NOT EXISTS academy_lessons (
  id                SERIAL PRIMARY KEY,
  lesson_date       DATE NOT NULL,
  topic_id          TEXT NOT NULL,
  difficulty        TEXT NOT NULL,
  lesson_content    TEXT NOT NULL,
  lesson_image_url  TEXT,
  quest_data        JSONB NOT NULL,
  quiz_data         JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lesson_date, topic_id, difficulty)
);

CREATE INDEX IF NOT EXISTS idx_academy_lessons_lookup
  ON academy_lessons(lesson_date, topic_id, difficulty);

CREATE INDEX IF NOT EXISTS idx_academy_progress_player
  ON academy_progress(player_id);
