-- 045-creature-lore
-- Structured player-facing Biosphere creature biography and physical profile.
-- Technical visual-generation text remains in description/prompt_used and is
-- never rendered by the client. Run manually in Neon SQL Editor before
-- deploying the code that writes new creature lore; never through an API.

ALTER TABLE creature_models
  ADD COLUMN IF NOT EXISTS lore JSONB;

-- No synthetic backfill for personal legacy creatures: their old visual
-- prompt is not player lore and does not contain trustworthy bilingual
-- biography/physical measurements. Legacy rows stay NULL and the client
-- displays a neutral localized "field record unavailable" message.
--
-- Optional future backfill should be an audited offline script that derives
-- lore from each creature's traits/image, never a blanket SQL fabrication.

COMMENT ON COLUMN creature_models.lore IS
  'Validated CreatureLore schema v1: bilingual uk/en summary, story, temperament, diet, habitatBehavior plus sizeCm, weightKg and lifespanYears';

ALTER TABLE creature_models
  DROP CONSTRAINT IF EXISTS creature_models_lore_shape_check;

ALTER TABLE creature_models
  ADD CONSTRAINT creature_models_lore_shape_check CHECK (
    lore IS NULL OR (
      lore->>'schemaVersion' = '1'
      AND jsonb_typeof(lore->'summary') = 'object'
      AND jsonb_typeof(lore->'story') = 'object'
      AND jsonb_typeof(lore->'temperament') = 'object'
      AND jsonb_typeof(lore->'diet') = 'object'
      AND jsonb_typeof(lore->'habitatBehavior') = 'object'
      AND coalesce(length(trim(lore->'summary'->>'uk')), 0) > 0
      AND coalesce(length(trim(lore->'summary'->>'en')), 0) > 0
      AND coalesce(length(trim(lore->'story'->>'uk')), 0) > 0
      AND coalesce(length(trim(lore->'story'->>'en')), 0) > 0
      AND coalesce(length(trim(lore->'temperament'->>'uk')), 0) > 0
      AND coalesce(length(trim(lore->'temperament'->>'en')), 0) > 0
      AND coalesce(length(trim(lore->'diet'->>'uk')), 0) > 0
      AND coalesce(length(trim(lore->'diet'->>'en')), 0) > 0
      AND coalesce(length(trim(lore->'habitatBehavior'->>'uk')), 0) > 0
      AND coalesce(length(trim(lore->'habitatBehavior'->>'en')), 0) > 0
      AND jsonb_typeof(lore->'sizeCm') = 'number'
      AND jsonb_typeof(lore->'weightKg') = 'number'
      AND jsonb_typeof(lore->'lifespanYears') = 'number'
      AND (lore->>'sizeCm')::numeric BETWEEN 2 AND 2500
      AND (lore->>'weightKg')::numeric BETWEEN 0.01 AND 12000
      AND (lore->>'lifespanYears')::numeric BETWEEN 0.5 AND 500
    )
  ) NOT VALID;

-- Existing rows are NULL, so validation is safe and future writes are checked.
ALTER TABLE creature_models
  VALIDATE CONSTRAINT creature_models_lore_shape_check;
