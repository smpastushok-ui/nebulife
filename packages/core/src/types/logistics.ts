// ---------------------------------------------------------------------------
// Logistics — ships, cargo, trade routes, production queue
// ---------------------------------------------------------------------------

// ── Producible Units ──────────────────────────────────────────────────────

/** Types of units that can be produced at Landing Pad / Spaceport */
export type ProducibleType =
  | 'research_shuttle'          // reusable carrier for probes / satellites
  | 'rover_dropcraft'           // reusable surface expedition carrier
  | 'atmo_probe_carrier'        // reusable carrier for giant-planet probes
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
  | 'terraform_freighter'       // specialized terraforming resource hauler
  | 'colony_ship';              // 500 colonists + colony hub kit

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

/** Item in a production queue (launch infrastructure builds one at a time) */
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
  water: number;
  elements: Record<string, number>;
  units: DeployableUnit[];
  colonists: number;
}

/** Create empty cargo manifest */
export function createEmptyManifest(): CargoManifest {
  return { minerals: 0, volatiles: 0, isotopes: 0, water: 0, elements: {}, units: [], colonists: 0 };
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
  /** Optional mission/shipment currently reserving the ship. */
  assignmentId?: string | null;
}

export type CargoShipmentStatus = 'loading' | 'outbound' | 'unloading' | 'returning' | 'completed';

export interface CargoShipment {
  id: string;
  shipId: string;
  fromPlanetId: string;
  toPlanetId: string;
  resource: 'minerals' | 'volatiles' | 'isotopes' | 'water';
  amount: number;
  status: CargoShipmentStatus;
  startedAt: number;
  phaseStartedAt: number;
  flightMs: number;
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
  cargoShipments?: CargoShipment[];
  routes: TradeRoute[];
  /** Production queues per planet: planetId -> queue items */
  productionQueues: Record<string, ProductionQueueItem[]>;
}

/** Create empty fleet state */
export function createFleetState(): FleetState {
  return { ships: [], cargoShipments: [], routes: [], productionQueues: {} };
}

export const RESEARCH_TRANSPORT_TYPES: ProducibleType[] = [
  'research_shuttle',
  'rover_dropcraft',
  'atmo_probe_carrier',
];

export const ONE_SHOT_PAYLOAD_TYPES: ProducibleType[] = [
  'survey_probe',
  'orbital_satellite',
  'surface_rover',
  'atmosphere_probe',
  'scout_drone',
  'mining_drone',
  'orbital_telescope_unit',
];

export const HEAVY_SHIP_TYPES: ProducibleType[] = [
  'lander',
  'research_station_kit',
  'transport_small',
  'transport_large',
  'terraform_freighter',
  'colony_ship',
];

export function isShipProducible(type: ProducibleType): boolean {
  return RESEARCH_TRANSPORT_TYPES.includes(type) || HEAVY_SHIP_TYPES.includes(type);
}

export const PRODUCIBLE_ASSET_PATHS: Record<ProducibleType, string> = {
  research_shuttle: '/payloads/research_shuttle.webp',
  rover_dropcraft: '/payloads/rover_dropcraft.webp',
  atmo_probe_carrier: '/payloads/atmo_probe_carrier.webp',
  survey_probe: '/payloads/survey_probe.webp',
  orbital_satellite: '/payloads/orbital_satellite.webp',
  surface_rover: '/payloads/surface_rover.webp',
  lander: '/payloads/lander.webp',
  atmosphere_probe: '/payloads/atmosphere_probe.webp',
  scout_drone: '/payloads/scout_drone.webp',
  mining_drone: '/payloads/mining_drone.webp',
  orbital_telescope_unit: '/payloads/orbital_telescope_unit.webp',
  research_station_kit: '/payloads/research_station_kit.webp',
  transport_small: '/payloads/cargo_small.webp',
  transport_large: '/payloads/cargo_large.webp',
  terraform_freighter: '/payloads/terraform_freighter.webp',
  colony_ship: '/payloads/colony_ship.webp',
};

// ── Producible Definitions ────────────────────────────────────────────────

export const PRODUCIBLE_DEFS: Record<ProducibleType, ProducibleDef> = {
  research_shuttle: {
    type: 'research_shuttle',
    name: 'Дослідницький шатл',
    description: 'Багаторазовий носій для скан-зондів та орбітальних супутників.',
    productionTimeMs: 35 * 60_000,
    cost: [
      { resource: 'Fe', amount: 30 }, { resource: 'Ti', amount: 18 },
      { resource: 'Cu', amount: 12 }, { resource: 'isotopes', amount: 16 },
    ],
    requiresBuilding: 'landing_pad',
    cargoCapacity: 30, colonistCapacity: 0,
    baseSpeed: 0.006, fuelPerLY: 4,
  },

  rover_dropcraft: {
    type: 'rover_dropcraft',
    name: 'Ровер-дропкрафт',
    description: 'Багаторазовий посадковий транспорт для поверхневих експедицій.',
    productionTimeMs: 50 * 60_000,
    cost: [
      { resource: 'Fe', amount: 42 }, { resource: 'Ti', amount: 24 },
      { resource: 'Al', amount: 18 }, { resource: 'isotopes', amount: 20 },
    ],
    requiresBuilding: 'landing_pad',
    cargoCapacity: 45, colonistCapacity: 0,
    baseSpeed: 0.0045, fuelPerLY: 6,
  },

  atmo_probe_carrier: {
    type: 'atmo_probe_carrier',
    name: 'Носій атмосферних зондів',
    description: 'Багаторазовий посилений носій для дослідження газових та крижаних гігантів.',
    productionTimeMs: 60 * 60_000,
    cost: [
      { resource: 'Ti', amount: 36 }, { resource: 'Si', amount: 20 },
      { resource: 'volatiles', amount: 24 }, { resource: 'isotopes', amount: 28 },
    ],
    requiresBuilding: 'landing_pad',
    cargoCapacity: 55, colonistCapacity: 0,
    baseSpeed: 0.004, fuelPerLY: 8,
  },

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
    requiresBuilding: 'landing_pad',
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
    requiresBuilding: 'landing_pad',
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

  terraform_freighter: {
    type: 'terraform_freighter',
    name: 'Терраформувальний фрейтер',
    description: 'Спеціалізований вантажний корабель для доставки великих партій ресурсів терраформування.',
    productionTimeMs: 150 * 60_000,
    cost: [
      { resource: 'Fe', amount: 110 }, { resource: 'Ti', amount: 70 },
      { resource: 'Cu', amount: 35 }, { resource: 'Al', amount: 60 },
      { resource: 'isotopes', amount: 55 },
    ],
    requiresBuilding: 'spaceport',
    cargoCapacity: 1500, colonistCapacity: 0,
    baseSpeed: 0.004, fuelPerLY: 18,
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
