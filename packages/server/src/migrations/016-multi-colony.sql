-- Migration 016: Multi-colony economy foundation (Phase 7A)
-- Run in Neon SQL Editor. Do NOT create an API endpoint for this.

-- Per-planet resource storage: keyed by planet.id, value = {minerals, volatiles, isotopes, water}
ALTER TABLE players ADD COLUMN IF NOT EXISTS colony_resources_by_planet JSONB NOT NULL DEFAULT '{}';

-- Planet overrides after terraforming: keyed by planet.id, value = {type, habitability, biomeMapVariant}
-- Populated in Phase 7C when a planet completes terraforming (overallProgress >= 95).
ALTER TABLE players ADD COLUMN IF NOT EXISTS planet_overrides JSONB NOT NULL DEFAULT '{}';
