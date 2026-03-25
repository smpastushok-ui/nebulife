// ---------------------------------------------------------------------------
// Colony tick — master per-planet resource/energy/production update
// ---------------------------------------------------------------------------

import type { PlanetColonyState } from '../types/colony.js';
import { getStorageCapacity } from '../types/colony.js';
import type { PlacedBuilding, UniquePlanetResource } from '../types/surface.js';
import { BUILDING_DEFS } from '../types/surface.js';
import { COLONY_TICK_INTERVAL_MS } from '../constants/balance.js';
import type { TechTreeState } from './tech-tree.js';
import { getEffectValue } from './tech-tree.js';
import { computeEnergyBalance, applyEnergyTick, restoreShutdownBuildings } from './energy.js';
import type { Planet } from '../types/planet.js';
import { getTerrainBonus, getSolarEnergyMultiplier, getWindMultiplier, getAtmoMultiplier } from './planet-rules.js';
import type { SurfaceTile } from '../types/surface.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ColonyTickResult {
  colony: PlanetColonyState;
  /** Building IDs shut down this tick due to energy deficit */
  shutdownIds: string[];
  /** Building IDs restored this tick */
  restoredIds: string[];
  /** Research data generated this tick */
  researchDataProduced: number;
  /** Elements produced by refinery buildings this tick */
  elementsProduced: Record<string, number>;
}

/**
 * Run colony ticks since the last update. Handles multiple accumulated ticks
 * (e.g. after app was backgrounded) by running them sequentially.
 *
 * @param colony - current colony state (mutated in place)
 * @param planet - static planet data for terrain/atmosphere bonuses
 * @param techState - player's tech tree state
 * @param tileAt - function to get the SurfaceTile at building's (x,y)
 * @param now - current timestamp (ms)
 * @returns aggregated tick result
 */
export function runColonyTicks(
  colony: PlanetColonyState,
  planet: Planet,
  techState: TechTreeState,
  tileAt: (x: number, y: number) => SurfaceTile | undefined,
  now: number,
): ColonyTickResult {
  const elapsed = now - colony.lastTickAt;
  const tickCount = Math.floor(elapsed / COLONY_TICK_INTERVAL_MS);

  if (tickCount <= 0) {
    return {
      colony,
      shutdownIds: [],
      restoredIds: [],
      researchDataProduced: 0,
      elementsProduced: {},
    };
  }

  // Cap to prevent huge catch-up (max 60 ticks = 1 hour)
  const effectiveTicks = Math.min(tickCount, 60);

  let totalShutdownIds: string[] = [];
  let totalRestoredIds: string[] = [];
  let totalResearchData = 0;
  const totalElements: Record<string, number> = {};

  for (let t = 0; t < effectiveTicks; t++) {
    const result = runSingleTick(colony, planet, techState, tileAt);
    totalShutdownIds = [...totalShutdownIds, ...result.shutdownIds];
    totalRestoredIds = [...totalRestoredIds, ...result.restoredIds];
    totalResearchData += result.researchDataProduced;
    for (const [el, amt] of Object.entries(result.elementsProduced)) {
      totalElements[el] = (totalElements[el] ?? 0) + amt;
    }
  }

  colony.lastTickAt = colony.lastTickAt + tickCount * COLONY_TICK_INTERVAL_MS;

  return {
    colony,
    shutdownIds: totalShutdownIds,
    restoredIds: totalRestoredIds,
    researchDataProduced: totalResearchData,
    elementsProduced: totalElements,
  };
}

// ---------------------------------------------------------------------------
// Single tick
// ---------------------------------------------------------------------------

function runSingleTick(
  colony: PlanetColonyState,
  planet: Planet,
  techState: TechTreeState,
  tileAt: (x: number, y: number) => SurfaceTile | undefined,
): { shutdownIds: string[]; restoredIds: string[]; researchDataProduced: number; elementsProduced: Record<string, number> } {
  const buildings = colony.buildings;

  // 1. Recompute energy
  colony.energy = computeEnergyBalance(buildings, techState, colony.energy.stored);

  // 2. Apply energy tick (may shut down buildings)
  const energyResult = applyEnergyTick(colony.energy, buildings);
  colony.energy = energyResult.energy;

  // 3. If surplus, try restoring shutdown buildings
  let restoredIds: string[] = [];
  if (colony.energy.netBalance > 0) {
    // Recompute after shutdowns
    colony.energy = computeEnergyBalance(buildings, techState, colony.energy.stored);
    restoredIds = restoreShutdownBuildings(colony.energy, buildings);
    if (restoredIds.length > 0) {
      colony.energy = computeEnergyBalance(buildings, techState, colony.energy.stored);
    }
  }

  // 4. Resource production from active buildings
  const miningMult = getEffectValue(techState, 'mining_yield_mult', 1);
  const storageMult = getEffectValue(techState, 'storage_capacity_mult', 1);

  let researchDataProduced = 0;
  const elementsProduced: Record<string, number> = {};

  for (const b of buildings) {
    if (b.shutdown) continue;
    const def = BUILDING_DEFS[b.type];
    const tile = tileAt(b.x, b.y);
    const terrainMult = tile ? getTerrainBonus(b.type, tile.terrain).multiplier : 1;

    // Environment multipliers
    let envMult = 1;
    if (b.type === 'solar_plant') {
      const starLum = 1; // TODO: pass actual star luminosity
      const distAU = planet.orbit.semiMajorAxisAU;
      envMult = getSolarEnergyMultiplier(starLum, distAU);
    } else if (b.type === 'wind_generator' && planet.atmosphere) {
      envMult = getWindMultiplier(planet.atmosphere.surfacePressureAtm);
    } else if (b.type === 'atmo_extractor' && planet.atmosphere) {
      envMult = getAtmoMultiplier(planet.atmosphere.surfacePressureAtm);
    }

    // Produce resources
    for (const prod of def.production) {
      const baseMult = prod.resource === 'minerals' || prod.resource === 'volatiles' || prod.resource === 'isotopes'
        ? miningMult : 1;
      const amount = prod.amount * baseMult * terrainMult * envMult;

      if (prod.resource === 'researchData') {
        researchDataProduced += amount;
      } else if (prod.resource === 'habitability') {
        // Habitability accumulates differently; skip resource capping
      } else if (prod.resource === 'minerals' || prod.resource === 'volatiles' || prod.resource === 'isotopes') {
        const cap = getStorageCapacity(colony.storage, prod.resource as 'minerals' | 'volatiles' | 'isotopes') * storageMult;
        colony.resources[prod.resource as keyof typeof colony.resources] = Math.min(
          (colony.resources[prod.resource as keyof typeof colony.resources] ?? 0) + amount,
          cap,
        );
      }
    }

    // Consume resources
    for (const con of def.consumption) {
      if (con.resource === 'minerals' || con.resource === 'volatiles' || con.resource === 'isotopes') {
        const key = con.resource as keyof typeof colony.resources;
        colony.resources[key] = Math.max(0, (colony.resources[key] ?? 0) - con.amount);
      }
    }
  }

  // 5. Refinery batch processing: quantum_separator, gas_fractionator, isotope_centrifuge
  for (const b of buildings) {
    if (b.shutdown) continue;
    const elems = processRefineryBuilding(b, colony);
    for (const [el, amt] of Object.entries(elems)) {
      elementsProduced[el] = (elementsProduced[el] ?? 0) + amt;
    }
  }

  // 6. Extract unique planet resources (deep_drill)
  if (colony.uniqueResources) {
    for (const b of buildings) {
      if (b.shutdown || b.type !== 'deep_drill') continue;
      for (const ur of colony.uniqueResources) {
        if (ur.remaining <= 0) continue;
        const extracted = Math.min(ur.extractionRate, ur.remaining);
        ur.remaining -= extracted;
        colony.chemicalInventory[ur.element] = (colony.chemicalInventory[ur.element] ?? 0) + extracted;
        elementsProduced[ur.element] = (elementsProduced[ur.element] ?? 0) + extracted;
      }
    }
  }

  return { shutdownIds: energyResult.shutdownIds, restoredIds, researchDataProduced, elementsProduced };
}

// ---------------------------------------------------------------------------
// Refinery processing
// ---------------------------------------------------------------------------

/** Element pools that refineries can produce */
const MINERAL_ELEMENTS = ['Fe', 'Cu', 'Ti', 'Al', 'Si', 'Ni'];
const VOLATILE_ELEMENTS = ['H', 'He', 'N', 'O', 'C', 'S'];

/**
 * Refinery cycle period in ticks (base). Higher level = fewer ticks per batch.
 * Level 1: every 5 ticks, Level 5: every 3 ticks (floor(5 / (1 + 0.2*(level-1))))
 */
const REFINERY_BASE_CYCLE_TICKS = 5;

function getRefineryCycleTicks(level: number): number {
  return Math.max(1, Math.floor(REFINERY_BASE_CYCLE_TICKS / (1 + 0.20 * (level - 1))));
}

/** Track refinery tick counters per building (reset on page load is fine — catch-up handles it) */
const refineryCounters = new Map<string, number>();

function processRefineryBuilding(
  b: PlacedBuilding,
  colony: PlanetColonyState,
): Record<string, number> {
  const produced: Record<string, number> = {};
  const isRefinery = b.type === 'quantum_separator' || b.type === 'gas_fractionator' || b.type === 'isotope_centrifuge';
  if (!isRefinery) return produced;

  // Accumulate ticks, produce only on cycle completion
  const counter = (refineryCounters.get(b.id) ?? 0) + 1;
  const cycleTicks = getRefineryCycleTicks(b.level);

  if (counter < cycleTicks) {
    refineryCounters.set(b.id, counter);
    return produced;
  }

  // Cycle complete — reset counter and produce
  refineryCounters.set(b.id, 0);

  if (b.type === 'quantum_separator') {
    // Consumed 2 minerals/tick from def.consumption over cycle, produce 1 random element
    const pool = MINERAL_ELEMENTS;
    const el = pool[Math.floor(Math.random() * pool.length)];
    colony.chemicalInventory[el] = (colony.chemicalInventory[el] ?? 0) + 1;
    produced[el] = (produced[el] ?? 0) + 1;
  } else if (b.type === 'gas_fractionator') {
    // Consumed 2 volatiles/tick, produce 1 random element
    const pool = VOLATILE_ELEMENTS;
    const el = pool[Math.floor(Math.random() * pool.length)];
    colony.chemicalInventory[el] = (colony.chemicalInventory[el] ?? 0) + 1;
    produced[el] = (produced[el] ?? 0) + 1;
  } else if (b.type === 'isotope_centrifuge') {
    // Consumed 1 isotope/tick, produce U with 40% chance
    if (Math.random() < 0.4) {
      colony.chemicalInventory['U'] = (colony.chemicalInventory['U'] ?? 0) + 1;
      produced['U'] = (produced['U'] ?? 0) + 1;
    }
  }

  return produced;
}
