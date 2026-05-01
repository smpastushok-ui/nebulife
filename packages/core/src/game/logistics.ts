// ---------------------------------------------------------------------------
// Logistics — ship travel, trade routes, cargo operations
// ---------------------------------------------------------------------------

import type { Ship, TradeRoute, FleetState, CargoManifest } from '../types/logistics.js';
import { PRODUCIBLE_DEFS, createEmptyManifest } from '../types/logistics.js';
import type { PlanetColonyState } from '../types/colony.js';
import type { TechTreeState } from './tech-tree.js';
import { getEffectValue } from './tech-tree.js';

// ---------------------------------------------------------------------------
// Ship launch
// ---------------------------------------------------------------------------

export interface LaunchResult {
  success: boolean;
  reason?: string;
}

/**
 * Launch a docked ship toward a destination planet.
 * Calculates travel time from distance and ship speed.
 */
export function launchShip(
  ship: Ship,
  destinationPlanetId: string,
  distanceLY: number,
  techState: TechTreeState,
  now: number,
): LaunchResult {
  if (ship.status !== 'docked') {
    return { success: false, reason: 'Корабель не в доку' };
  }

  const def = PRODUCIBLE_DEFS[ship.type];
  const speedMult = getEffectValue(techState, 'ship_speed_mult', 1);
  const speed = def.baseSpeed * speedMult;

  // Fuel check
  const fuelNeeded = def.fuelPerLY * distanceLY;
  if (ship.fuelRemaining < fuelNeeded) {
    return { success: false, reason: `Недостатньо палива: потрібно ${Math.ceil(fuelNeeded)}, є ${Math.floor(ship.fuelRemaining)}` };
  }

  // Travel time in milliseconds
  // Speed is in fraction of c; 1 LY at speed c = 1 year
  // We compress time: 1 LY at 0.01c takes ~100 game-ticks (100 min)
  const travelTimeMs = (distanceLY / speed) * 60_000; // 1 speed unit = 1 LY per minute

  ship.status = 'in_transit';
  ship.destinationPlanetId = destinationPlanetId;
  ship.departedAt = now;
  ship.arrivalAt = now + travelTimeMs;
  ship.fuelRemaining -= fuelNeeded;
  ship.currentPlanetId = null;

  return { success: true };
}

// ---------------------------------------------------------------------------
// Ship travel tick
// ---------------------------------------------------------------------------

export interface ArrivalEvent {
  shipId: string;
  planetId: string;
}

/**
 * Tick all ships in transit. Ships that have arrived are set to 'docked'.
 */
export function tickShipTravel(fleet: FleetState, now: number): ArrivalEvent[] {
  const arrivals: ArrivalEvent[] = [];

  for (const ship of fleet.ships) {
    if (ship.status === 'in_transit' && ship.arrivalAt && now >= ship.arrivalAt) {
      ship.status = 'docked';
      ship.currentPlanetId = ship.destinationPlanetId;
      ship.destinationPlanetId = null;
      ship.departedAt = null;
      ship.arrivalAt = null;

      if (ship.currentPlanetId) {
        arrivals.push({ shipId: ship.id, planetId: ship.currentPlanetId });
      }
    }
  }

  return arrivals;
}

// ---------------------------------------------------------------------------
// Cargo operations
// ---------------------------------------------------------------------------

/**
 * Load resources from a colony into a ship's cargo.
 */
export function loadCargo(
  ship: Ship,
  colony: PlanetColonyState,
  manifest: Partial<CargoManifest>,
): { loaded: boolean; reason?: string } {
  const def = PRODUCIBLE_DEFS[ship.type];
  if (def.cargoCapacity <= 0) {
    return { loaded: false, reason: 'Цей корабель не має вантажного відсіку' };
  }

  const currentCargo = getCargoWeight(ship.cargo);
  const maxLoad = def.cargoCapacity - currentCargo;

  if (maxLoad <= 0) {
    return { loaded: false, reason: 'Вантажний відсік повний' };
  }

  let loaded = 0;

  // Load bulk resources
  for (const key of ['minerals', 'volatiles', 'isotopes', 'water'] as const) {
    const requested = manifest[key] ?? 0;
    if (requested <= 0) continue;
    const available = colony.resources[key];
    const toLoad = Math.min(requested, available, maxLoad - loaded);
    if (toLoad > 0) {
      colony.resources[key] -= toLoad;
      ship.cargo[key] += toLoad;
      loaded += toLoad;
    }
  }

  return { loaded: true };
}

/**
 * Unload ship cargo into a colony.
 */
export function unloadCargo(
  ship: Ship,
  colony: PlanetColonyState,
): void {
  for (const key of ['minerals', 'volatiles', 'isotopes', 'water'] as const) {
    colony.resources[key] += ship.cargo[key];
    ship.cargo[key] = 0;
  }

  // Unload elements
  for (const [el, amt] of Object.entries(ship.cargo.elements)) {
    colony.chemicalInventory[el] = (colony.chemicalInventory[el] ?? 0) + amt;
  }
  ship.cargo.elements = {};

  // Colonists handled separately (colony establishment)
  ship.cargo.colonists = 0;
  ship.cargo.units = [];
}

/**
 * Refuel a ship from colony isotope reserves.
 */
export function refuelShip(
  ship: Ship,
  colony: PlanetColonyState,
  amount: number,
): number {
  const def = PRODUCIBLE_DEFS[ship.type];
  const maxFuel = def.fuelPerLY * 100; // max 100 LY range when full
  const canAdd = maxFuel - ship.fuelRemaining;
  const available = colony.resources.isotopes;
  const toAdd = Math.min(amount, canAdd, available);

  ship.fuelRemaining += toAdd;
  colony.resources.isotopes -= toAdd;
  return toAdd;
}

// ---------------------------------------------------------------------------
// Trade routes
// ---------------------------------------------------------------------------

/**
 * Create an automated trade route.
 */
export function createTradeRoute(
  fleet: FleetState,
  shipId: string,
  fromPlanetId: string,
  toPlanetId: string,
  cargoTemplate: Partial<CargoManifest>,
): TradeRoute | null {
  const ship = fleet.ships.find(s => s.id === shipId);
  if (!ship || ship.status !== 'docked') return null;

  const route: TradeRoute = {
    id: `route-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    shipId,
    fromPlanetId,
    toPlanetId,
    cargoTemplate,
    isAutomatic: true,
    tripCount: 0,
  };

  fleet.routes.push(route);
  return route;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCargoWeight(cargo: CargoManifest): number {
  return cargo.minerals + cargo.volatiles + cargo.isotopes + cargo.water +
    Object.values(cargo.elements).reduce((s, v) => s + v, 0) +
    cargo.units.length * 10; // each unit weighs 10 cargo units
}
