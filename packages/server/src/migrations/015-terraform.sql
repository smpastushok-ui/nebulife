-- Migration 015: Terraforming state
-- Run in Neon SQL Editor.  Do NOT create an API endpoint for this.
--
-- terraform_state: keyed by planetId → PlanetTerraformState JSON.
--   Only planets with active progress are stored; empty object = no activity.
--
-- fleet_state: array of Mission objects for active delivery missions.
--   Stored at the player level because missions span multiple planets.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS terraform_state JSONB NOT NULL DEFAULT '{}';

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS fleet_state JSONB NOT NULL DEFAULT '[]';
