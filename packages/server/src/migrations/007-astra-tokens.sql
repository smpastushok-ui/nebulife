CREATE TABLE IF NOT EXISTS astra_tokens (
  player_id TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tokens_used INT NOT NULL DEFAULT 0,
  tokens_purchased INT NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, usage_date)
);
