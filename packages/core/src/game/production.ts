// ---------------------------------------------------------------------------
// Production system — ship/drone/unit production queue management
// ---------------------------------------------------------------------------

import type { ProductionQueueItem, ProducibleType, FleetState, Ship, CargoManifest } from '../types/logistics.js';
import { PRODUCIBLE_DEFS, isProductionComplete, createEmptyManifest } from '../types/logistics.js';
import type { PlanetColonyState } from '../types/colony.js';
import type { PlacedBuilding } from '../types/surface.js';

// ---------------------------------------------------------------------------
// Queue management
// ---------------------------------------------------------------------------

export interface StartProductionResult {
  success: boolean;
  reason?: string;
  item?: ProductionQueueItem;
}

/**
 * Attempt to add a unit to the production queue.
 * Checks: required building exists, resources available, queue not full.
 */
export function startProduction(
  type: ProducibleType,
  planetId: string,
  colony: PlanetColonyState,
  fleet: FleetState,
  now: number,
): StartProductionResult {
  const def = PRODUCIBLE_DEFS[type];
  const queue = fleet.productionQueues[planetId] ?? [];

  // 1. Check required building
  const reqBuilding = def.requiresBuilding;
  const hasBuilding = colony.buildings.some(b => b.type === reqBuilding && !b.shutdown);
  if (!hasBuilding) {
    return { success: false, reason: `Потрібна будівля: ${reqBuilding === 'landing_pad' ? 'Посадковий майданчик' : 'Космопорт'}` };
  }

  // 2. Queue limit: 5 items per planet
  if (queue.length >= 5) {
    return { success: false, reason: 'Черга виробництва заповнена (макс 5)' };
  }

  // 3. Check resources
  for (const cost of def.cost) {
    const available = getResourceAmount(cost.resource, colony);
    if (available < cost.amount) {
      return { success: false, reason: `Недостатньо ${cost.resource}: потрібно ${cost.amount}, є ${Math.floor(available)}` };
    }
  }

  // 4. Deduct resources
  for (const cost of def.cost) {
    deductResource(cost.resource, cost.amount, colony);
  }

  // 5. Create queue item
  const item: ProductionQueueItem = {
    id: `prod-${planetId}-${now}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    startedAt: now,
    durationMs: def.productionTimeMs,
    paid: true,
  };

  if (!fleet.productionQueues[planetId]) {
    fleet.productionQueues[planetId] = [];
  }
  fleet.productionQueues[planetId].push(item);

  return { success: true, item };
}

/**
 * Tick all production queues across all planets.
 * Completes items whose time has elapsed and creates ships/units.
 */
export function tickProduction(
  fleet: FleetState,
  now: number,
): CompletedProduction[] {
  const completed: CompletedProduction[] = [];

  for (const [planetId, queue] of Object.entries(fleet.productionQueues)) {
    const remaining: ProductionQueueItem[] = [];

    for (const item of queue) {
      if (isProductionComplete(item, now)) {
        const result = completeProduction(item, planetId, fleet, now);
        if (result) completed.push(result);
      } else {
        remaining.push(item);
      }
    }

    fleet.productionQueues[planetId] = remaining;
  }

  return completed;
}

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

export interface CompletedProduction {
  planetId: string;
  type: ProducibleType;
  shipId?: string;
}

function completeProduction(
  item: ProductionQueueItem,
  planetId: string,
  fleet: FleetState,
  now: number,
): CompletedProduction | null {
  const def = PRODUCIBLE_DEFS[item.type];

  // Create ship/unit
  const ship: Ship = {
    id: `ship-${now}-${Math.random().toString(36).slice(2, 6)}`,
    type: item.type,
    name: def.name,
    status: 'docked',
    currentPlanetId: planetId,
    destinationPlanetId: null,
    cargo: createEmptyManifest(),
    fuelRemaining: 0,
    departedAt: null,
    arrivalAt: null,
  };

  fleet.ships.push(ship);

  return { planetId, type: item.type, shipId: ship.id };
}

// ---------------------------------------------------------------------------
// Resource helpers
// ---------------------------------------------------------------------------

function getResourceAmount(resource: string, colony: PlanetColonyState): number {
  if (resource === 'minerals') return colony.resources.minerals;
  if (resource === 'volatiles') return colony.resources.volatiles;
  if (resource === 'isotopes') return colony.resources.isotopes;
  // Chemical element
  return colony.chemicalInventory[resource] ?? 0;
}

function deductResource(resource: string, amount: number, colony: PlanetColonyState): void {
  if (resource === 'minerals') {
    colony.resources.minerals = Math.max(0, colony.resources.minerals - amount);
  } else if (resource === 'volatiles') {
    colony.resources.volatiles = Math.max(0, colony.resources.volatiles - amount);
  } else if (resource === 'isotopes') {
    colony.resources.isotopes = Math.max(0, colony.resources.isotopes - amount);
  } else {
    // Chemical element
    colony.chemicalInventory[resource] = Math.max(0, (colony.chemicalInventory[resource] ?? 0) - amount);
  }
}
