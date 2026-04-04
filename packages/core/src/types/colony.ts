// ---------------------------------------------------------------------------
// Colony state — per-planet colony management
// ---------------------------------------------------------------------------

import type { ColonyResources, ChemicalInventory } from './resources.js';
import type { PlacedBuilding, UniquePlanetResource } from './surface.js';

// ── Energy ────────────────────────────────────────────────────────────────

/** Per-planet energy balance computed from buildings each tick */
export interface PlanetEnergyState {
  /** Total energy produced per tick by all generators */
  production: number;
  /** Total energy consumed per tick by all consumers */
  consumption: number;
  /** Net balance = production - consumption */
  netBalance: number;
  /** Max storable energy (from Battery Stations) */
  storageCapacity: number;
  /** Currently stored energy (0..storageCapacity) */
  stored: number;
}

/** Create default energy state (no buildings) */
export function createEnergyState(): PlanetEnergyState {
  return { production: 0, consumption: 0, netBalance: 0, storageCapacity: 0, stored: 0 };
}

// ── Storage ───────────────────────────────────────────────────────────────

/** Per-planet resource storage capacities */
export interface StorageState {
  /** Base capacity provided by Colony Hub */
  base: {
    minerals: number;
    volatiles: number;
    isotopes: number;
    water: number;
  };
  /** Bonus capacity from Resource Storage modules */
  bonus: {
    minerals: number;
    volatiles: number;
    isotopes: number;
    water: number;
  };
}

/** Create default storage state (Colony Hub base values) */
export function createStorageState(): StorageState {
  return {
    base: { minerals: 1000, volatiles: 1000, isotopes: 1000, water: 1000 },
    bonus: { minerals: 0, volatiles: 0, isotopes: 0, water: 0 },
  };
}

/** Get total storage capacity for a resource type */
export function getStorageCapacity(storage: StorageState, type: 'minerals' | 'volatiles' | 'isotopes' | 'water'): number {
  return storage.base[type] + storage.bonus[type];
}

// ── Population ────────────────────────────────────────────────────────────

export interface PopulationState {
  /** Current population count */
  current: number;
  /** Max capacity from residential domes + tech bonuses */
  capacity: number;
}

export function createPopulationState(): PopulationState {
  return { current: 0, capacity: 0 };
}

// ── Colony State (per planet) ─────────────────────────────────────────────

/** Full colony state for a single planet */
export interface PlanetColonyState {
  planetId: string;
  /** Colony resources (minerals, volatiles, isotopes) */
  resources: ColonyResources;
  /** Element-level inventory (Fe, Cu, Ti, etc.) */
  chemicalInventory: ChemicalInventory;
  /** Energy balance and storage */
  energy: PlanetEnergyState;
  /** Resource storage capacities */
  storage: StorageState;
  /** Population tracking */
  population: PopulationState;
  /** Placed buildings on the surface */
  buildings: PlacedBuilding[];
  /** Unique finite resources on this planet */
  uniqueResources: UniquePlanetResource[];
  /** Timestamp of last colony tick */
  lastTickAt: number;
}

/** Create a fresh colony state for a new planet */
export function createPlanetColonyState(planetId: string): PlanetColonyState {
  return {
    planetId,
    resources: { minerals: 0, volatiles: 0, isotopes: 0, water: 0 },
    chemicalInventory: {},
    energy: createEnergyState(),
    storage: createStorageState(),
    population: createPopulationState(),
    buildings: [],
    uniqueResources: [],
    lastTickAt: Date.now(),
  };
}
