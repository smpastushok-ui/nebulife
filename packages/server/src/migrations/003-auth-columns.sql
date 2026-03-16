-- Add auth and gameplay columns that were missing from initial migration
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

-- Auth columns
ALTER TABLE players ADD COLUMN IF NOT EXISTS quarks INTEGER NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS firebase_uid TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'anonymous';
ALTER TABLE players ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS callsign TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS callsign_set_at TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ;

-- Index for Firebase UID lookups (used by auth middleware)
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_firebase_uid
  ON players(firebase_uid) WHERE firebase_uid IS NOT NULL;

-- Messages table (chat system)
CREATE TABLE IF NOT EXISTS messages (
  id              SERIAL PRIMARY KEY,
  sender_id       TEXT NOT NULL,
  sender_name     TEXT NOT NULL,
  channel         TEXT NOT NULL DEFAULT 'global',
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_channel_time
  ON messages(channel, created_at DESC);

-- Surface buildings (colony building system)
CREATE TABLE IF NOT EXISTS surface_buildings (
  id              TEXT PRIMARY KEY,
  player_id       TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  planet_id       TEXT NOT NULL,
  type            TEXT NOT NULL,
  x               INTEGER NOT NULL,
  y               INTEGER NOT NULL,
  level           INTEGER NOT NULL DEFAULT 1,
  built_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surface_buildings_player_planet
  ON surface_buildings(player_id, planet_id);

-- Aliases table (custom names for systems/planets)
CREATE TABLE IF NOT EXISTS aliases (
  id              SERIAL PRIMARY KEY,
  player_id       TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  custom_name     TEXT NOT NULL,
  UNIQUE(player_id, entity_type, entity_id)
);
