-- 033: Device-id recovery key for anonymous (guest) players.
--
-- Guest identity is the Firebase anonymous UID. When the WebView/Firebase
-- session is lost (some app updates, WebView storage migration, etc.) a NEW
-- anonymous UID is minted and /api/auth/register creates a fresh empty player —
-- the old progress row becomes orphaned. Capacitor Device.getId() is stable
-- across app updates, so we store it as a SECONDARY recovery key: on register,
-- if no row matches the new UID, we re-link the most recent anonymous row that
-- carries the same device_id. Device id is a recovery HINT only — never an auth
-- credential (Firebase token still gates every API call).
--
-- Run in Neon SQL Editor.

ALTER TABLE players ADD COLUMN IF NOT EXISTS device_id TEXT;

-- Partial index: we only ever look device_id up among anonymous players, and a
-- device can legitimately carry several guest rows over its lifetime, so this
-- is intentionally NON-unique.
CREATE INDEX IF NOT EXISTS idx_players_device_id
  ON players(device_id) WHERE device_id IS NOT NULL;
