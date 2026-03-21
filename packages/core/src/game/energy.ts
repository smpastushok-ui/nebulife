// ---------------------------------------------------------------------------
// Energy system — compute balance, apply tick, shutdown on deficit
// ---------------------------------------------------------------------------

import type { PlanetEnergyState } from '../types/colony.js';
import type { PlacedBuilding, BuildingType } from '../types/surface.js';
import { BUILDING_DEFS } from '../types/surface.js';
import { BASE_ENERGY_STORAGE, ENERGY_SHUTDOWN_PRIORITY } from '../constants/balance.js';
import type { TechTreeState } from './tech-tree.js';
import { getEffectValue } from './tech-tree.js';

// ---------------------------------------------------------------------------
// Compute energy balance from buildings
// ---------------------------------------------------------------------------

/**
 * Recomputes the energy balance for a set of buildings.
 * Does NOT mutate buildings — returns a fresh PlanetEnergyState.
 *
 * - `energyOutputMult`: tech multiplier on production (e.g. 1.15 = +15%)
 * - `energyConsumptionMult`: tech multiplier on consumption (e.g. 0.85 = -15%)
 */
export function computeEnergyBalance(
  buildings: PlacedBuilding[],
  techState: TechTreeState,
  previousStored?: number,
): PlanetEnergyState {
  const energyOutMult = getEffectValue(techState, 'energy_output_mult', 1);
  const energyConMult = getEffectValue(techState, 'energy_consumption_mult', 1);

  let production = 0;
  let consumption = 0;
  let storageCapacity = BASE_ENERGY_STORAGE;

  for (const b of buildings) {
    if (b.shutdown) continue;
    const def = BUILDING_DEFS[b.type];

    production += def.energyOutput * energyOutMult;
    consumption += def.energyConsumption * energyConMult;
    storageCapacity += def.energyStorageAdd;
  }

  const netBalance = production - consumption;
  const stored = Math.min(previousStored ?? 0, storageCapacity);

  return { production, consumption, netBalance, storageCapacity, stored };
}

// ---------------------------------------------------------------------------
// Apply one energy tick
// ---------------------------------------------------------------------------

/**
 * Applies one energy tick:
 * 1. If netBalance >= 0: store surplus (capped at storageCapacity)
 * 2. If netBalance < 0: drain from stored. If stored reaches 0, trigger shutdowns.
 *
 * Returns updated energy state and array of building IDs that were shut down.
 */
export function applyEnergyTick(
  energy: PlanetEnergyState,
  buildings: PlacedBuilding[],
): { energy: PlanetEnergyState; shutdownIds: string[] } {
  const shutdownIds: string[] = [];

  if (energy.netBalance >= 0) {
    // Surplus: store
    const newStored = Math.min(
      energy.stored + energy.netBalance,
      energy.storageCapacity,
    );
    return {
      energy: { ...energy, stored: newStored },
      shutdownIds: [],
    };
  }

  // Deficit: try to drain stored
  const deficit = Math.abs(energy.netBalance);
  let newStored = energy.stored - deficit;

  if (newStored >= 0) {
    // Stored covers the deficit
    return {
      energy: { ...energy, stored: newStored },
      shutdownIds: [],
    };
  }

  // Not enough stored — need to shut down buildings
  newStored = 0;

  // Sort active consumers by shutdown priority (lowest first = shut down first)
  const activeConsumers = buildings
    .filter(b => !b.shutdown && BUILDING_DEFS[b.type].energyConsumption > 0)
    .sort((a, b) => {
      const pa = ENERGY_SHUTDOWN_PRIORITY[a.type] ?? 100;
      const pb = ENERGY_SHUTDOWN_PRIORITY[b.type] ?? 100;
      return pa - pb;
    });

  let reclaimed = 0;
  for (const b of activeConsumers) {
    if (reclaimed >= deficit) break;
    b.shutdown = true;
    shutdownIds.push(b.id);
    reclaimed += BUILDING_DEFS[b.type].energyConsumption;
  }

  return {
    energy: { ...energy, stored: newStored },
    shutdownIds,
  };
}

// ---------------------------------------------------------------------------
// Restore buildings when energy surplus returns
// ---------------------------------------------------------------------------

/**
 * Attempts to restore previously shut-down buildings, highest priority first.
 * Call after recomputing energy balance when net is positive.
 */
export function restoreShutdownBuildings(
  energy: PlanetEnergyState,
  buildings: PlacedBuilding[],
): string[] {
  const restoredIds: string[] = [];

  // Sort shutdown buildings by priority descending (restore high-priority first)
  const shutdownBuildings = buildings
    .filter(b => b.shutdown)
    .sort((a, b) => {
      const pa = ENERGY_SHUTDOWN_PRIORITY[a.type] ?? 100;
      const pb = ENERGY_SHUTDOWN_PRIORITY[b.type] ?? 100;
      return pb - pa; // highest priority = restore first
    });

  let availableEnergy = energy.netBalance + energy.stored;

  for (const b of shutdownBuildings) {
    const cost = BUILDING_DEFS[b.type].energyConsumption;
    if (availableEnergy >= cost) {
      b.shutdown = false;
      restoredIds.push(b.id);
      availableEnergy -= cost;
    }
  }

  return restoredIds;
}
