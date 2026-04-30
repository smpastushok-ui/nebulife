// ---------------------------------------------------------------------------
// Logistics — ships, cargo, trade routes, production queue
// ---------------------------------------------------------------------------

// ── Producible Units ──────────────────────────────────────────────────────

/** Types of units that can be produced at Spaceport / Landing Pad */
export type ProducibleType =
  | 'survey_probe'              // one-shot orbital survey payload
  | 'orbital_satellite'         // persistent orbital science payload
  | 'surface_rover'             // surface expedition payload
  | 'lander'                    // landing platform / lab delivery
  | 'atmosphere_probe'          // reinforced gas/ice giant probe
  | 'scout_drone'              // fast explorer, 1 isotope/move
  | 'mining_drone'             // auto-harvests surface tiles, 3x yield
  | 'orbital_telescope_unit'   // deployable telescope, +2 researchData/tick
  | 'research_station_kit'     // deployable lab on another planet
  | 'transport_small'          // 100 cargo capacity
  | 'transport_large'          // 1000 cargo capacity
  | 'colony_ship';             // 500 colonists + colony hub kit

/** Static definition for a producible unit */
export interface ProducibleDef {
  type: ProducibleType;
  name: string;
  description: string;
  /** Production time in milliseconds */
  productionTimeMs: number;
  /** Resources consumed to produce */
  cost: { resource: string; amount: number }[];
  /** Required building on the planet: 'landing_pad' or 'spaceport' */
  requiresBuilding: 'landing_pad' | 'spaceport';
  /** Cargo capacity (0 for drones) */
  cargoCapacity: number;
  /** Colonist capacity (only colony_ship) */
  colonistCapacity: number;
  /** Base speed in fraction of c (light speed) */
  baseSpeed: number;
  /** Isotope fuel cost per light-year */
  fuelPerLY: number;
}

// ── Production Queue ──────────────────────────────────────────────────────

/** Item in a production queue (Spaceport builds one at a time) */
export interface ProductionQueueItem {
  id: string;
  type: ProducibleType;
  /** Timestamp when production started */
  startedAt: number;
  /** Total production duration in ms */
  durationMs: number;
  /** Resources already deducted */
  paid: boolean;
}

/** Compute progress 0-100 for a queue item */
export function getProductionProgress(item: ProductionQueueItem, now: number): number {
  if (!item.paid) return 0;
  const elapsed = now - item.startedAt;
  return Math.min(100, (elapsed / item.durationMs) * 100);
}

/** Check if a queue item is complete */
export function isProductionComplete(item: ProductionQueueItem, now: number): boolean {
  return item.paid && (now - item.startedAt) >= item.durationMs;
}

// ── Ships ─────────────────────────────────────────────────────────────────

export type ShipStatus = 'docked' | 'loading' | 'in_transit' | 'arriving' | 'unloading';

/** Deployable unit stored inside a ship */
export interface DeployableUnit {
  type: ProducibleType;
  id: string;
}

/** Cargo manifest — what a ship carries */
export interface CargoManifest {
  minerals: number;
  volatiles: number;
  isotopes: number;
  elements: Record<string, number>;
  units: DeployableUnit[];
  colonists: number;
}

/** Create empty cargo manifest */
export function createEmptyManifest(): CargoManifest {
  return { minerals: 0, volatiles: 0, isotopes: 0, elements: {}, units: [], colonists: 0 };
}

/** A ship instance */
export interface Ship {
  id: string;
  type: ProducibleType;
  name: string;
  status: ShipStatus;
  /** Planet where the ship is currently docked (null if in transit) */
  currentPlanetId: string | null;
  /** Destination planet (null if docked) */
  destinationPlanetId: string | null;
  /** Cargo contents */
  cargo: CargoManifest;
  /** Remaining fuel (isotopes) */
  fuelRemaining: number;
  /** Timestamp when ship departed */
  departedAt: number | null;
  /** Timestamp when ship arrives */
  arrivalAt: number | null;
}

// ── Trade Routes ──────────────────────────────────────────────────────────

/** Automated trade route between two planets */
export interface TradeRoute {
  id: string;
  shipId: string;
  fromPlanetId: string;
  toPlanetId: string;
  /** What to load each trip (partial — only specified fields) */
  cargoTemplate: Partial<CargoManifest>;
  /** Auto-repeat the route */
  isAutomatic: boolean;
  /** Number of completed trips */
  tripCount: number;
}

// ── Fleet State ───────────────────────────────────────────────────────────

/** Global fleet state (all ships and routes across all planets) */
export interface FleetState {
  ships: Ship[];
  routes: TradeRoute[];
  /** Production queues per planet: planetId -> queue items */
  productionQueues: Record<string, ProductionQueueItem[]>;
}

/** Create empty fleet state */
export function createFleetState(): FleetState {
  return { ships: [], routes: [], productionQueues: {} };
}

// ── Producible Definitions ────────────────────────────────────────────────

export const PRODUCIBLE_DEFS: Record<ProducibleType, ProducibleDef> = {
  survey_probe: {
    type: 'survey_probe',
    name: 'Оглядовий зонд',
    description: 'Одноразовий payload для швидкого орбітального сканування.',
    productionTimeMs: 8 * 60_000,
    cost: [
      { resource: 'Fe', amount: 8 }, { resource: 'Cu', amount: 4 },
      { resource: 'isotopes', amount: 3 },
    ],
    requiresBuilding: 'landing_pad',
    cargoCapacity: 0, colonistCapacity: 0,
    baseSpeed: 0.006, fuelPerLY: 2,
  },

  orbital_satellite: {
    type: 'orbital_satellite',
    name: 'Орбітальний супутник',
    description: 'Супутник для детального сканування атмосфери, гідросфери та ресурсів.',
    productionTimeMs: 25 * 60_000,
    cost: [
      { resource: 'Ti', amount: 16 }, { resource: 'Si', amount: 12 },
      { resource: 'Cu', amount: 8 }, { resource: 'isotopes', amount: 10 },
    ],
    requiresBuilding: 'landing_pad',
    cargoCapacity: 0, colonistCapacity: 0,
    baseSpeed: 0.005, fuelPerLY: 4,
  },

  surface_rover: {
    type: 'surface_rover',
    name: 'Поверхневий ровер',
    description: 'Мобільна лабораторія для підтвердження життя і картографії родовищ.',
    productionTimeMs: 45 * 60_000,
    cost: [
      { resource: 'Fe', amount: 25 }, { resource: 'Ti', amount: 14 },
      { resource: 'Cu', amount: 10 }, { resource: 'isotopes', amount: 12 },
    ],
    requiresBuilding: 'spaceport',
    cargoCapacity: 0, colonistCapacity: 0,
    baseSpeed: 0.004, fuelPerLY: 6,
  },

  lander: {
    type: 'lander',
    name: 'Посадковий модуль',
    description: 'Платформа для доставки ровера або польової лабораторії на поверхню.',
    productionTimeMs: 50 * 60_000,
    cost: [
      { resource: 'Fe', amount: 35 }, { resource: 'Ti', amount: 18 },
      { resource: 'Al', amount: 16 }, { resource: 'isotopes', amount: 14 },
    ],
    requiresBuilding: 'spaceport',
    cargoCapacity: 0, colonistCapacity: 0,
    baseSpeed: 0.004, fuelPerLY: 7,
  },

  atmosphere_probe: {
    type: 'atmosphere_probe',
    name: 'Атмосферний зонд',
    description: 'Посилений зонд для глибоких шарів газових та крижаних гігантів.',
    productionTimeMs: 55 * 60_000,
    cost: [
      { resource: 'Ti', amount: 28 }, { resource: 'Si', amount: 18 },
      { resource: 'volatiles', amount: 18 }, { resource: 'isotopes', amount: 22 },
    ],
    requiresBuilding: 'spaceport',
    cargoCapacity: 0, colonistCapacity: 0,
    baseSpeed: 0.004, fuelPerLY: 8,
  },

  scout_drone: {
    type: 'scout_drone',
    name: 'Дрон-розвідник',
    description: 'Швидкий розвідник поверхні. 1 ізотоп за хід.',
    productionTimeMs: 10 * 60_000, // 10 min
    cost: [
      { resource: 'Fe', amount: 10 }, { resource: 'Cu', amount: 5 },
      { resource: 'isotopes', amount: 5 },
    ],
    requiresBuilding: 'landing_pad',
    cargoCapacity: 0, colonistCapacity: 0,
    baseSpeed: 0.005, fuelPerLY: 2,
  },

  mining_drone: {
    type: 'mining_drone',
    name: 'Видобувний дрон',
    description: 'Автоматичний збір ресурсів. 3x вихід.',
    productionTimeMs: 15 * 60_000,
    cost: [
      { resource: 'Fe', amount: 15 }, { resource: 'Cu', amount: 10 },
      { resource: 'Ti', amount: 5 }, { resource: 'isotopes', amount: 8 },
    ],
    requiresBuilding: 'landing_pad',
    cargoCapacity: 0, colonistCapacity: 0,
    baseSpeed: 0.003, fuelPerLY: 3,
  },

  orbital_telescope_unit: {
    type: 'orbital_telescope_unit',
    name: 'Орбітальний телескоп (модуль)',
    description: 'Розгортається на орбіті. +2 дані досліджень/тік.',
    productionTimeMs: 30 * 60_000,
    cost: [
      { resource: 'Ti', amount: 20 }, { resource: 'Si', amount: 15 },
      { resource: 'Cu', amount: 10 }, { resource: 'isotopes', amount: 15 },
    ],
    requiresBuilding: 'landing_pad',
    cargoCapacity: 0, colonistCapacity: 0,
    baseSpeed: 0.004, fuelPerLY: 4,
  },

  research_station_kit: {
    type: 'research_station_kit',
    name: 'Комплект дослідницької станції',
    description: 'Розгортається на поверхні іншої планети як лабораторія.',
    productionTimeMs: 60 * 60_000,
    cost: [
      { resource: 'Ti', amount: 40 }, { resource: 'Cu', amount: 30 },
      { resource: 'Si', amount: 25 }, { resource: 'Fe', amount: 30 },
      { resource: 'isotopes', amount: 30 },
    ],
    requiresBuilding: 'spaceport',
    cargoCapacity: 0, colonistCapacity: 0,
    baseSpeed: 0.005, fuelPerLY: 8,
  },

  transport_small: {
    type: 'transport_small',
    name: 'Малий транспорт',
    description: 'Доставка дронів, супутників та вантажу. 100 одиниць.',
    productionTimeMs: 45 * 60_000,
    cost: [
      { resource: 'Fe', amount: 40 }, { resource: 'Ti', amount: 20 },
      { resource: 'Cu', amount: 15 }, { resource: 'Al', amount: 20 },
      { resource: 'isotopes', amount: 20 },
    ],
    requiresBuilding: 'spaceport',
    cargoCapacity: 100, colonistCapacity: 0,
    baseSpeed: 0.008, fuelPerLY: 5,
  },

  transport_large: {
    type: 'transport_large',
    name: 'Важкий транспорт',
    description: 'Масове перевезення ресурсів між планетами. 1000 одиниць.',
    productionTimeMs: 120 * 60_000,
    cost: [
      { resource: 'Fe', amount: 80 }, { resource: 'Ti', amount: 40 },
      { resource: 'Cu', amount: 30 }, { resource: 'Al', amount: 40 },
      { resource: 'isotopes', amount: 40 },
    ],
    requiresBuilding: 'spaceport',
    cargoCapacity: 1000, colonistCapacity: 0,
    baseSpeed: 0.005, fuelPerLY: 15,
  },

  colony_ship: {
    type: 'colony_ship',
    name: 'Колонізаційний корабель',
    description: '500 колоністів + комплект бази для нової колонії.',
    productionTimeMs: 180 * 60_000,
    cost: [
      { resource: 'Fe', amount: 100 }, { resource: 'Ti', amount: 60 },
      { resource: 'Cu', amount: 40 }, { resource: 'Al', amount: 50 },
      { resource: 'Si', amount: 30 }, { resource: 'U', amount: 5 },
      { resource: 'isotopes', amount: 60 },
    ],
    requiresBuilding: 'spaceport',
    cargoCapacity: 200, colonistCapacity: 500,
    baseSpeed: 0.003, fuelPerLY: 25,
  },
};
