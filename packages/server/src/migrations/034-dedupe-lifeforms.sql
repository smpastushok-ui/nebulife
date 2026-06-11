-- 034 — Dedupe lifeforms collection
-- ---------------------------------------------------------------------------
-- A client double-fire (and the previously missing server-side dedup) let a
-- player accumulate several rows of the SAME bundled species. The bundled
-- photo_url uniquely identifies a species, so any two "found" rows for the
-- same player sharing a photo_url are duplicates.
--
-- This migration:
--   1) deletes the duplicate rows (keeps ONE "best" row per player+species),
--   2) adds a partial UNIQUE index so duplicates can never be inserted again.
--
-- Run in the Neon SQL Editor. Safe to re-run (idempotent).
-- ---------------------------------------------------------------------------

-- (Optional) inspect how many duplicates exist before deleting:
--   SELECT player_id, photo_url, COUNT(*) AS copies
--   FROM lifeforms
--   WHERE photo_url IS NOT NULL
--   GROUP BY player_id, photo_url
--   HAVING COUNT(*) > 1
--   ORDER BY copies DESC;

-- 1) Remove duplicate species per player, keeping the most valuable row:
--    prefer a player-renamed name, then one that already has a video, then the
--    earliest created (stable, deterministic tiebreak on id).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY player_id, photo_url
      ORDER BY
        (species_name IS NOT NULL) DESC,
        (video_url    IS NOT NULL) DESC,
        created_at ASC,
        id ASC
    ) AS rn
  FROM lifeforms
  WHERE photo_url IS NOT NULL
)
DELETE FROM lifeforms
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Backstop: one bundled species per player can ever exist again.
--    (paid uniques get distinct generated URLs; rows without a photo_url are
--    excluded, so in-progress paid finds are unaffected.)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lifeforms_player_photo
  ON lifeforms (player_id, photo_url)
  WHERE photo_url IS NOT NULL;
