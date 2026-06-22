-- 037-immutable-player-identity
-- Player identity is permanent. `id` is the auth/player row identity and
-- `global_index` is the deterministic galaxy seat ("Explorer number").
-- Renames must only change `callsign` / `name`; they must never free, swap, or
-- recycle these identifiers.

-- Keep future sequence allocations above every currently assigned seat.
SELECT setval(
  'player_global_index_seq',
  COALESCE((SELECT MAX(global_index) FROM players), -1) + 1,
  false
);

CREATE OR REPLACE FUNCTION prevent_player_identity_rewrite()
RETURNS trigger AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'players.id is immutable once created'
      USING ERRCODE = '23514';
  END IF;

  IF OLD.global_index IS NOT NULL
     AND NEW.global_index IS DISTINCT FROM OLD.global_index THEN
    RAISE EXCEPTION 'players.global_index is immutable once assigned'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_player_identity_rewrite ON players;
CREATE TRIGGER trg_prevent_player_identity_rewrite
BEFORE UPDATE OF id, global_index ON players
FOR EACH ROW
EXECUTE FUNCTION prevent_player_identity_rewrite();
