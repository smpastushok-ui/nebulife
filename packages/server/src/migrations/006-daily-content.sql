CREATE TABLE IF NOT EXISTS daily_content (
  id SERIAL PRIMARY KEY,
  content_type VARCHAR(20) NOT NULL,
  content_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content_json TEXT NOT NULL,
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(content_type, content_date)
);
