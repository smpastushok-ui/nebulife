CREATE TABLE IF NOT EXISTS weekly_digest (
  id SERIAL PRIMARY KEY,
  week_date DATE NOT NULL,
  news_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending_text',
  images_generated INT NOT NULL DEFAULT 0,
  images_json TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(week_date)
);
