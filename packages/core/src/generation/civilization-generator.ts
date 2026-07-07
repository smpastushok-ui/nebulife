// ---------------------------------------------------------------------------
// Civilization generation — deterministic, lazy, never persisted.
//
// NEXT_GEN_PLAN §B: civilizations are rare (~3-5% of eligible core-zone
// planets) sentient life. Generation is a pure function of `planet.seed`
// (itself already deterministic from the galaxy/system/planet generation
// chain) plus the planet's core depth — same seed always yields the same
// civilization, so nothing needs to be stored: call this again whenever the
// result is needed (mission report, civilization card, etc).
// ---------------------------------------------------------------------------

import { SeededRNG } from '../math/rng.js';
import type { Planet } from '../types/planet.js';
import type { Civilization, TechEra, Temperament } from '../types/civilization.js';

/** Local copy of the solid-planet check (mirrors `game/planet-exploration.ts`
 *  `isSolidPlanetForLanding`) — kept independent to avoid a generation→game
 *  layering dependency for a one-line predicate. */
function isSolidPlanet(planet: Planet): boolean {
  return planet.type === 'rocky' || planet.type === 'terrestrial' || planet.type === 'dwarf';
}

/** Civilizations only ever appear on core systems at depth >= 2 (NEXT_GEN_PLAN §B). */
export const CIVILIZATION_MIN_CORE_DEPTH = 2;

/** ~3-5% of eligible planets host a civilization. */
export const CIVILIZATION_CHANCE = 0.04;

/** Salt XORed into the planet seed so the civilization roll doesn't correlate
 *  with other planet-seed-derived rolls (resources, moons, life, etc). */
const CIVILIZATION_SEED_SALT = 0x43495631; // 'CIV1'

const TECH_ERA_WEIGHTS: Record<TechEra, number> = {
  stone: 30,
  agrarian: 35,
  industrial: 25,
  orbital: 10,
};

const TECH_ERA_ORDER: TechEra[] = ['stone', 'agrarian', 'industrial', 'orbital'];

/** Population range per era (pre-integration headcount used for flavor + workforce sizing). */
const TECH_ERA_POPULATION_RANGE: Record<TechEra, { min: number; max: number }> = {
  stone: { min: 200, max: 3_000 },
  agrarian: { min: 5_000, max: 400_000 },
  industrial: { min: 500_000, max: 20_000_000 },
  orbital: { min: 10_000_000, max: 500_000_000 },
};

const TEMPERAMENT_WEIGHTS: Record<Temperament, number> = {
  peaceful: 45,
  wary: 35,
  hostile: 20,
};

const TEMPERAMENT_ORDER: Temperament[] = ['peaceful', 'wary', 'hostile'];

/**
 * Whether a planet is even eligible to roll a civilization. Dwarf planets are
 * excluded — too small to plausibly host a full civilization at any era.
 */
export function isCivilizationEligiblePlanet(planet: Planet, coreDepth: number): boolean {
  if (coreDepth < CIVILIZATION_MIN_CORE_DEPTH) return false;
  if (planet.type === 'dwarf') return false;
  return isSolidPlanet(planet);
}

/**
 * Derive the (possibly absent) civilization living on a planet. Pure and
 * deterministic: same `planet.seed` + `coreDepth` always returns an
 * identical result (see `check-civilization-determinism.ts`).
 *
 * `coreDepth` should be the CoreSystem depth (0 = entry star, higher = closer
 * to galactic center). Client code without direct access to `CoreSystem` can
 * approximate it from `StarSystem.ringIndex` via
 * `Math.max(0, (system.ringIndex ?? 0) - 3)`, matching
 * `generateCoreStarSystem()`'s `ringIndex = 3 + min(depth, 9)` encoding.
 */
export function generateCivilization(planet: Planet, coreDepth: number): Civilization | null {
  if (!isCivilizationEligiblePlanet(planet, coreDepth)) return null;

  const rng = new SeededRNG((planet.seed ^ CIVILIZATION_SEED_SALT) >>> 0);
  if (!rng.nextBool(CIVILIZATION_CHANCE)) return null;

  const techEra = rng.weightedChoice(TECH_ERA_ORDER, TECH_ERA_ORDER.map((era) => TECH_ERA_WEIGHTS[era]));
  const temperament = rng.weightedChoice(TEMPERAMENT_ORDER, TEMPERAMENT_ORDER.map((t) => TEMPERAMENT_WEIGHTS[t]));
  const popRange = TECH_ERA_POPULATION_RANGE[techEra];
  const population = Math.round(rng.nextFloat(popRange.min, popRange.max));
  const aestheticSeed = rng.deriveSeed(777);

  return {
    id: `civ-${planet.id}`,
    planetId: planet.id,
    planetSeed: planet.seed,
    techEra,
    population,
    temperament,
    aestheticSeed,
  };
}

/** Normalized [0, 0.5] population factor used by the workforce production multiplier. */
export function getCivilizationPopulationFactor(civ: Civilization): number {
  const range = TECH_ERA_POPULATION_RANGE[civ.techEra];
  const span = Math.max(1, range.max - range.min);
  const normalized = Math.max(0, Math.min(1, (civ.population - range.min) / span));
  return 0.5 * normalized;
}
