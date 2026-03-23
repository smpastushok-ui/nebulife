CREATE TABLE IF NOT EXISTS ad_rewards (
  player_id TEXT NOT NULL,
  reward_date DATE NOT NULL DEFAULT CURRENT_DATE,
  views_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, reward_date)
);
