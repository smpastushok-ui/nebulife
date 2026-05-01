// ---------------------------------------------------------------------------
// Colony tick — master per-planet resource/energy/production update
// ---------------------------------------------------------------------------

import type { PlanetColonyState, PlanetEnergyState, PlanetResourceStocks } from '../types/colony.js';
import { getStorageCapacity } from '../types/colony.js';
import type { BuildingType, PlacedBuilding, UniquePlanetResource } from '../types/surface.js';
import { BUILDING_DEFS } from '../types/surface.js';
import { BASE_ENERGY_STORAGE, COLONY_TICK_INTERVAL_MS } from '../constants/balance.js';
import type { TechTreeState } from './tech-tree.js';
import { getEffectValue } from './tech-tree.js';
import { applyEnergyTick, restoreShutdownBuildings } from './energy.js';
import type { Planet } from '../types/planet.js';
import { getTerrainBonus, getSolarEnergyMultiplier, getWindMultiplier, getAtmoMultiplier } from './planet-rules.js';
import type { SurfaceTile } from '../types/surface.js';
import { depleteStock } from './planet-stocks.js';
import { SeededRNG } from '../math/rng.js';

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
  /** Updated planet resource stocks after depletion (undefined if no stocks were passed in) */
  updatedStocks?: PlanetResourceStocks;
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
 * @param planetStocks - optional finite planet stocks; when provided, extraction
 *   buildings will deplete them and have their output scaled by depletion efficiency
 * @returns aggregated tick result
 */
export function runColonyTicks(
  colony: PlanetColonyState,
  planet: Planet,
  techState: TechTreeState,
  tileAt: (x: number, y: number) => SurfaceTile | undefined,
  now: number,
  planetStocks?: PlanetResourceStocks,
  starLuminosityLSun = 1,
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
      updatedStocks: planetStocks,
    };
  }

  // Cap to prevent huge catch-up (max 60 ticks = 1 hour)
  const effectiveTicks = Math.min(tickCount, 60);

  let totalShutdownIds: string[] = [];
  let totalRestoredIds: string[] = [];
  let totalResearchData = 0;
  const totalElements: Record<string, number> = {};

  // Stocks are carried through tick by tick so each tick sees the latest remaining
  let currentStocks: PlanetResourceStocks | undefined = planetStocks;

  // Base tick index: derive from planet seed and current time bucket so that
  // refinery element selection is deterministic given the same inputs.
  const baseTick = Math.floor(colony.lastTickAt / COLONY_TICK_INTERVAL_MS);

  for (let t = 0; t < effectiveTicks; t++) {
    const tickIndex = baseTick + t;
    const result = runSingleTick(colony, planet, techState, tileAt, currentStocks, tickIndex, starLuminosityLSun);
    totalShutdownIds = [...totalShutdownIds, ...result.shutdownIds];
    totalRestoredIds = [...totalRestoredIds, ...result.restoredIds];
    totalResearchData += result.researchDataProduced;
    for (const [el, amt] of Object.entries(result.elementsProduced)) {
      totalElements[el] = (totalElements[el] ?? 0) + amt;
    }
    currentStocks = result.updatedStocks;
  }

  colony.lastTickAt = colony.lastTickAt + tickCount * COLONY_TICK_INTERVAL_MS;

  return {
    colony,
    shutdownIds: totalShutdownIds,
    restoredIds: totalRestoredIds,
    researchDataProduced: totalResearchData,
    elementsProduced: totalElements,
    updatedStocks: currentStocks,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Stable deterministic hash of a planet ID string (djb2 variant).
 *
 * Used as a fallback seed for legacy Planet objects where `seed === 0`
 * (planets generated before the `seed` field was introduced in v167).
 * This guarantees deterministic refinery element selection for any planet
 * regardless of its age, without ever resorting to Date.now() or Math.random().
 */
function hashPlanetId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  // >>> 0 converts to unsigned 32-bit int — safe positive seed for SeededRNG
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Single tick
// ---------------------------------------------------------------------------

/** Building types that extract from the finite planet deposit (depleting stocks). */
const EXTRACTION_BUILDING_TYPES = new Set<string>([
  'mine',
  'water_extractor',
  'atmo_extractor',
  'deep_drill',
  'orbital_collector',
  'isotope_collector',
  'alpha_harvester',
]);

function getBuildingEnergyMultiplier(
  buildingType: string,
  planet: Planet,
  tile: SurfaceTile | undefined,
  starLuminosityLSun: number,
): number {
  const terrainMult = tile ? getTerrainBonus(buildingType as BuildingType, tile.terrain).multiplier : 1;
  if (buildingType === 'solar_plant') {
    const raw = getSolarEnergyMultiplier(starLuminosityLSun, planet.orbit.semiMajorAxisAU);
    return Math.max(0.05, Math.min(3, raw)) * terrainMult;
  }
  if (buildingType === 'wind_generator' && planet.atmosphere) {
    return getWindMultiplier(planet.atmosphere.surfacePressureAtm) * terrainMult;
  }
  return terrainMult;
}

function computeContextualEnergyBalance(
  buildings: PlacedBuilding[],
  planet: Planet,
  techState: TechTreeState,
  tileAt: (x: number, y: number) => SurfaceTile | undefined,
  previousStored: number | undefined,
  starLuminosityLSun: number,
): PlanetEnergyState {
  const energyOutMult = getEffectValue(techState, 'energy_output_mult', 1);
  const energyConMult = getEffectValue(techState, 'energy_consumption_mult', 1);

  let production = 0;
  let consumption = 0;
  let storageCapacity = BASE_ENERGY_STORAGE;

  for (const b of buildings) {
    if (b.shutdown) continue;
    const def = BUILDING_DEFS[b.type];
    const tile = tileAt(b.x, b.y);
    production += def.energyOutput * energyOutMult * getBuildingEnergyMultiplier(b.type, planet, tile, starLuminosityLSun);
    consumption += def.energyConsumption * energyConMult;
    storageCapacity += def.energyStorageAdd;
  }

  const stored = Math.min(previousStored ?? 0, storageCapacity);
  return { production, consumption, netBalance: production - consumption, storageCapacity, stored };
}

function runSingleTick(
  colony: PlanetColonyState,
  planet: Planet,
  techState: TechTreeState,
  tileAt: (x: number, y: number) => SurfaceTile | undefined,
  planetStocks?: PlanetResourceStocks,
  tickIndex: number = 0,
  starLuminosityLSun = 1,
): { shutdownIds: string[]; restoredIds: string[]; researchDataProduced: number; elementsProduced: Record<string, number>; updatedStocks?: PlanetResourceStocks } {
  const buildings = colony.buildings;

  // 1. Recompute energy
  colony.energy = computeContextualEnergyBalance(buildings, planet, techState, tileAt, colony.energy.stored, starLuminosityLSun);

  // 2. Apply energy tick (may shut down buildings)
  const energyResult = applyEnergyTick(colony.energy, buildings);
  colony.energy = energyResult.energy;

  // 3. If surplus, try restoring shutdown buildings
  let restoredIds: string[] = [];
  if (colony.energy.netBalance > 0) {
    // Recompute after shutdowns
    colony.energy = computeContextualEnergyBalance(buildings, planet, techState, tileAt, colony.energy.stored, starLuminosityLSun);
    restoredIds = restoreShutdownBuildings(colony.energy, buildings);
    if (restoredIds.length > 0) {
      colony.energy = computeContextualEnergyBalance(buildings, planet, techState, tileAt, colony.energy.stored, starLuminosityLSun);
    }
  }

  // 4. Resource production from active buildings
  const miningMult = getEffectValue(techState, 'mining_yield_mult', 1);
  const storageMult = getEffectValue(techState, 'storage_capacity_mult', 1);

  const storageBonus = buildings
    .filter((b) => !b.shutdown)
    .reduce((sum, b) => sum + BUILDING_DEFS[b.type].storageCapacityAdd, 0);
  colony.storage.bonus = {
    minerals: storageBonus,
    volatiles: storageBonus,
    isotopes: storageBonus,
    water: storageBonus,
  };

  let researchDataProduced = 0;
  const elementsProduced: Record<string, number> = {};

  // Mutable copy of stocks — will be updated as each extraction building runs
  let currentStocks: PlanetResourceStocks | undefined = planetStocks;

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

    const isExtraction = EXTRACTION_BUILDING_TYPES.has(b.type);

    // Produce resources
    for (const prod of def.production) {
      const baseMult = prod.resource === 'minerals' || prod.resource === 'volatiles' || prod.resource === 'isotopes'
        ? miningMult : 1;
      const baseAmount = prod.amount * baseMult * terrainMult * envMult;

      if (prod.resource === 'researchData') {
        researchDataProduced += baseAmount;
      } else if (prod.resource === 'habitability') {
        // Habitability accumulates differently; skip resource capping
      } else if (prod.resource === 'minerals' || prod.resource === 'volatiles' || prod.resource === 'isotopes' || prod.resource === 'water') {
        const resourceKey = prod.resource as 'minerals' | 'volatiles' | 'isotopes' | 'water';
        let amount = baseAmount;

        // Apply depletion for extraction buildings when stocks are tracked
        if (isExtraction && currentStocks) {
          const { newStocks, actualExtracted } = depleteStock(currentStocks, resourceKey, baseAmount);
          currentStocks = newStocks;
          amount = actualExtracted;
        }

        const cap = getStorageCapacity(colony.storage, resourceKey) * storageMult;
        colony.resources[resourceKey] = Math.min(
          (colony.resources[resourceKey] ?? 0) + amount,
          cap,
        );
      }
    }

    // Consume resources
    for (const con of def.consumption) {
      if (con.resource === 'minerals' || con.resource === 'volatiles' || con.resource === 'isotopes' || con.resource === 'water') {
        const key = con.resource as keyof typeof colony.resources;
        colony.resources[key] = Math.max(0, (colony.resources[key] ?? 0) - con.amount);
      }
    }
  }

  // 5. Refinery batch processing: quantum_separator, gas_fractionator, isotope_centrifuge
  // Seeded RNG: planet.seed × tickIndex × buildingIndex → deterministic element selection.
  // Determinism is critical: NEVER use Date.now() / Math.random() here.
  // Legacy planets may have seed=0 (e.g. planets generated before v167 seed field was
  // added). In that case we derive a stable seed from planet.id via djb2 hash, which
  // is deterministic for a given planet and survives server restarts / reloads.
  const planetSeed = (planet.seed ?? 0) !== 0
    ? (planet.seed as number)
    : hashPlanetId(planet.id);
  for (let bi = 0; bi < buildings.length; bi++) {
    const b = buildings[bi];
    if (b.shutdown) continue;
    // Unique seed per (planet, tick, building position in array)
    const refinerySeed = ((planetSeed * 1000003) ^ (tickIndex * 65537) ^ (bi * 16777619)) >>> 0;
    const refineryRng = new SeededRNG(refinerySeed);
    const elems = processRefineryBuilding(b, colony, refineryRng);
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

  updatePopulationCapacityFromSupport(colony);

  return { shutdownIds: energyResult.shutdownIds, restoredIds, researchDataProduced, elementsProduced, updatedStocks: currentStocks };
}

// ---------------------------------------------------------------------------
// Refinery processing
// ---------------------------------------------------------------------------

/** Element pools that refineries can produce */
const MINERAL_ELEMENTS = ['Fe', 'Cu', 'Ti', 'Al', 'Si', 'Ni'];
const VOLATILE_ELEMENTS = ['H', 'He', 'N', 'C', 'S'];  // O removed: it is now a mineral element

function updatePopulationCapacityFromSupport(colony: PlanetColonyState): void {
  const housingCapacity = colony.buildings
    .filter((b) => !b.shutdown)
    .reduce((sum, b) => sum + BUILDING_DEFS[b.type].populationCapacityAdd, 0);
  const foodSupport = colony.buildings
    .filter((b) => !b.shutdown)
    .reduce((sum, b) => {
      const def = BUILDING_DEFS[b.type];
      const hasLifeSupportInputs = def.consumption.every((con) => {
        if (con.resource !== 'minerals' && con.resource !== 'volatiles' && con.resource !== 'isotopes' && con.resource !== 'water') return true;
        return (colony.resources[con.resource] ?? 0) > 0;
      });
      if (!hasLifeSupportInputs) return sum;
      const foodPerTick = BUILDING_DEFS[b.type].production
        .filter((prod) => prod.resource === 'food')
        .reduce((total, prod) => total + prod.amount, 0);
      return sum + foodPerTick * 60;
    }, 0);

  const supportedCapacity = Math.floor(Math.min(housingCapacity, foodSupport));
  colony.population.capacity = supportedCapacity;
  colony.population.current = Math.min(colony.population.current, supportedCapacity);
}

/**
 * Process one refinery building for a single tick.
 *
 * @param b      - the placed building to process
 * @param colony - mutable colony state; chemicalInventory is updated in-place
 * @param rng    - SeededRNG instance seeded from (planetSeed × tickIndex × buildingIndex).
 *   Element selection is fully deterministic: the same inputs always produce the
 *   same element. There is no Math.random() fallback — determinism is a hard
 *   requirement. Seed derivation is handled by the caller (runSingleTick).
 */
function processRefineryBuilding(
  b: PlacedBuilding,
  colony: PlanetColonyState,
  rng: SeededRNG,
): Record<string, number> {
  const produced: Record<string, number> = {};

  // Each refinery produces an element ONLY if the consumption side actually
  // had enough resource. Previously elements were emitted unconditionally —
  // mineral=0 colonies still received Ti/Cu/Fe etc., gas_fractionator with
  // 0 volatiles produced H/He, isotope_centrifuge with 0 isotopes produced U.
  if (b.type === 'quantum_separator') {
    if ((colony.resources.minerals ?? 0) < 2) return produced;
    const idx = rng.nextInt(0, MINERAL_ELEMENTS.length - 1);
    const el = MINERAL_ELEMENTS[idx];
    colony.chemicalInventory[el] = (colony.chemicalInventory[el] ?? 0) + 1;
    produced[el] = (produced[el] ?? 0) + 1;
  } else if (b.type === 'gas_fractionator') {
    if ((colony.resources.volatiles ?? 0) < 2) return produced;
    const idx = rng.nextInt(0, VOLATILE_ELEMENTS.length - 1);
    const el = VOLATILE_ELEMENTS[idx];
    colony.chemicalInventory[el] = (colony.chemicalInventory[el] ?? 0) + 1;
    produced[el] = (produced[el] ?? 0) + 1;
  } else if (b.type === 'isotope_centrifuge') {
    if ((colony.resources.isotopes ?? 0) < 1) return produced;
    // Deterministic enrichment: mostly U, sometimes Th for late-game chains.
    const el = rng.next() < 0.75 ? 'U' : 'Th';
    if (rng.next() < 0.45) {
      colony.chemicalInventory[el] = (colony.chemicalInventory[el] ?? 0) + 1;
      produced[el] = (produced[el] ?? 0) + 1;
    }
  }

  return produced;
}
