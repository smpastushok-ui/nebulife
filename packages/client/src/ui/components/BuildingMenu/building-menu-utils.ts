import type { BuildingType } from '@nebulife/core';

// ── Balance Constants ────────────────────────────────────────────────────────

export const MAX_BUILDING_LEVEL = 5;
export const UPGRADE_COST_MULTIPLIER = 1.5;
export const LEVEL_BONUS_PER_LEVEL = 0.20;

// ── Simplified costs (minerals / volatiles / isotopes) ───────────────────────

export interface ResCost { m: number; v: number; i: number }

export const BLDG_COSTS: Record<BuildingType, ResCost> = {
  colony_hub:         { m: 50,  v: 20, i: 10 },
  resource_storage:   { m: 30,  v: 0,  i: 0  },
  landing_pad:        { m: 40,  v: 5,  i: 5  },
  spaceport:          { m: 80,  v: 30, i: 20 },
  solar_plant:        { m: 20,  v: 0,  i: 5  },
  battery_station:    { m: 25,  v: 0,  i: 15 },
  wind_generator:     { m: 20,  v: 10, i: 0  },
  thermal_generator:  { m: 30,  v: 20, i: 5  },
  fusion_reactor:     { m: 50,  v: 10, i: 40 },
  mine:               { m: 15,  v: 0,  i: 0  },
  water_extractor:    { m: 15,  v: 10, i: 0  },
  atmo_extractor:     { m: 25,  v: 15, i: 0  },
  deep_drill:         { m: 40,  v: 5,  i: 5  },
  orbital_collector:  { m: 50,  v: 10, i: 20 },
  research_lab:       { m: 20,  v: 5,  i: 15 },
  observatory:        { m: 25,  v: 0,  i: 20 },
  radar_tower:        { m: 30,  v: 5,  i: 10 },
  orbital_telescope:  { m: 40,  v: 5,  i: 30 },
  quantum_computer:   { m: 50,  v: 0,  i: 50 },
  greenhouse:         { m: 20,  v: 15, i: 0  },
  residential_dome:   { m: 35,  v: 10, i: 5  },
  atmo_shield:        { m: 50,  v: 15, i: 20 },
  biome_dome:         { m: 45,  v: 25, i: 15 },
  quantum_separator:  { m: 30,  v: 10, i: 20 },
  gas_fractionator:   { m: 35,  v: 30, i: 10 },
  isotope_centrifuge: { m: 40,  v: 5,  i: 35 },
  genesis_vault:      { m: 100, v: 50, i: 80 },
  alpha_harvester:    { m: 0,   v: 0,  i: 0  },
};

// ── Cost calculations ────────────────────────────────────────────────────────

export function getUpgradeCost(
  buildingType: BuildingType,
  currentLevel: number,
): ResCost {
  if (currentLevel >= MAX_BUILDING_LEVEL) return { m: 0, v: 0, i: 0 };
  // TODO: Level 50+ — switch to chemical elements (Fe, Cu, Ti, Al, Si, U...)
  // if (currentLevel >= 50) return requireAdvancedElements(buildingType, currentLevel);
  const base = BLDG_COSTS[buildingType];
  const mult = Math.pow(UPGRADE_COST_MULTIPLIER, currentLevel);
  return {
    m: Math.ceil(base.m * mult),
    v: Math.ceil(base.v * mult),
    i: Math.ceil(base.i * mult),
  };
}

export function canAffordUpgrade(
  cost: ResCost,
  resources: { minerals: number; volatiles: number; isotopes: number },
): boolean {
  return resources.minerals >= cost.m
    && resources.volatiles >= cost.v
    && resources.isotopes >= cost.i;
}

// ── Level multiplier ─────────────────────────────────────────────────────────

export function getLevelMultiplier(level: number): number {
  return 1 + LEVEL_BONUS_PER_LEVEL * (level - 1);
}

/** Format production rate with level multiplier applied */
export function getScaledProduction(baseAmount: number, level: number): number {
  return baseAmount * getLevelMultiplier(level);
}

// ── Refinery speed scaling ───────────────────────────────────────────────────
// Refinery buildings get faster cycles (fewer ticks) instead of more output.
// Base cycle = 5 ticks. Higher level = fewer ticks per batch.

const REFINERY_BASE_CYCLE_TICKS = 5;

export function getRefineryCycleTicks(level: number): number {
  return Math.max(1, Math.floor(REFINERY_BASE_CYCLE_TICKS / (1 + LEVEL_BONUS_PER_LEVEL * (level - 1))));
}

// ── Observatory slot scaling ────────────────────────────────────────────────
// lv1-2 = 1 slot, lv3-4 = 2 slots, lv5 = 3 slots

export function getObservatorySlots(level: number): number {
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
}

// ── Time formatting ──────────────────────────────────────────────────────────

export function formatDuration(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec < 60) return `${totalSec}c`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec > 0 ? `${min}хв ${sec}c` : `${min}хв`;
  const hours = Math.floor(min / 60);
  const remMin = min % 60;
  return remMin > 0 ? `${hours}год ${remMin}хв` : `${hours}год`;
}
