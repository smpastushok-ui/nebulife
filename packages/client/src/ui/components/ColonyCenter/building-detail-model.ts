import type {
  BuildingType,
  PlacedBuilding,
  Planet,
  PlanetResourceStocks,
} from '@nebulife/core';
import { BUILDING_DEFS, getActiveBonuses } from '@nebulife/core';

export type ColonyResourceKey = 'minerals' | 'volatiles' | 'isotopes' | 'water';

export interface RateRow {
  resource: string;
  perHour: number;
}

export interface BuildingDetailStats {
  type: BuildingType;
  count: number;
  level: number;
  isShutdown: boolean;
  production: RateRow[];
  consumption: RateRow[];
  energyOutput: number;
  energyConsumption: number;
  energyStorageAdd: number;
  storageCapacityAdd: number;
  populationCapacityAdd: number;
  fogRevealRadius: number;
  activeBonusLabels: string[];
  stock?: {
    resource: ColonyResourceKey;
    remaining: number;
    initial: number;
    pct: number;
  };
  planetFit: 'good' | 'blocked' | 'conditional';
}

export const CORE_DETAIL_BUILDINGS: BuildingType[] = [
  'colony_hub',
  'resource_storage',
  'solar_plant',
  'battery_station',
  'mine',
  'water_extractor',
  'atmo_extractor',
  'deep_drill',
  'research_lab',
  'observatory',
  'radar_tower',
  'quantum_separator',
  'gas_fractionator',
];

const EXTRACTION_RESOURCE: Partial<Record<BuildingType, ColonyResourceKey>> = {
  mine: 'minerals',
  deep_drill: 'minerals',
  water_extractor: 'water',
  atmo_extractor: 'volatiles',
  orbital_collector: 'volatiles',
  isotope_collector: 'isotopes',
};

function toPerHour(amountPerTick: number): number {
  return amountPerTick * 60;
}

function stockFor(type: BuildingType, stocks?: PlanetResourceStocks): BuildingDetailStats['stock'] {
  const resource = EXTRACTION_RESOURCE[type];
  if (!resource || !stocks) return undefined;
  const initial = stocks.initial[resource] ?? 0;
  const remaining = stocks.remaining[resource] ?? 0;
  return {
    resource,
    initial,
    remaining,
    pct: initial > 0 ? Math.round((remaining / initial) * 100) : 0,
  };
}

function planetFitFor(type: BuildingType, planet: Planet): BuildingDetailStats['planetFit'] {
  const def = BUILDING_DEFS[type];
  if (!def.allowedPlanetTypes.includes(planet.type)) return 'blocked';
  if (def.requiresAtmosphere && !planet.atmosphere) return 'blocked';
  if (type === 'solar_plant' || type === 'wind_generator' || type === 'atmo_extractor') {
    return 'conditional';
  }
  return 'good';
}

export function deriveBuildingDetailStats(params: {
  type: BuildingType;
  planet: Planet;
  buildings: PlacedBuilding[];
  building?: PlacedBuilding;
  planetStocks?: PlanetResourceStocks;
}): BuildingDetailStats {
  const { type, planet, buildings, building, planetStocks } = params;
  const def = BUILDING_DEFS[type];
  const sameType = buildings.filter((b) => b.type === type);
  const count = Math.max(1, sameType.length || (building ? 1 : 0));
  const bonusMap = getActiveBonuses(buildings);
  const activeBonusLabels = building
    ? (bonusMap.get(building.id) ?? []).map((b) => b.bonusLabel)
    : sameType.flatMap((b) => (bonusMap.get(b.id) ?? []).map((bonus) => bonus.bonusLabel));
  const production: RateRow[] = [
    ...(def.energyOutput > 0 ? [{ resource: 'energy', perHour: toPerHour(def.energyOutput) * count }] : []),
    ...def.production.map((p) => ({ resource: p.resource, perHour: toPerHour(p.amount) * count })),
  ];
  const consumption: RateRow[] = [
    ...(def.energyConsumption > 0 ? [{ resource: 'energy', perHour: toPerHour(def.energyConsumption) * count }] : []),
    ...def.consumption.map((c) => ({ resource: c.resource, perHour: toPerHour(c.amount) * count })),
  ];

  return {
    type,
    count,
    level: building?.level ?? sameType[0]?.level ?? 1,
    isShutdown: Boolean(building?.shutdown ?? sameType.some((b) => b.shutdown)),
    production,
    consumption,
    energyOutput: def.energyOutput * count,
    energyConsumption: def.energyConsumption * count,
    energyStorageAdd: def.energyStorageAdd * count,
    storageCapacityAdd: def.storageCapacityAdd * count,
    populationCapacityAdd: def.populationCapacityAdd * count,
    fogRevealRadius: def.fogRevealRadius,
    activeBonusLabels,
    stock: stockFor(type, planetStocks),
    planetFit: planetFitFor(type, planet),
  };
}

export function primaryOutputResource(type: BuildingType): ColonyResourceKey | 'researchData' | 'habitability' | null {
  const prod = BUILDING_DEFS[type].production[0];
  if (!prod) return null;
  if (prod.resource === 'minerals' || prod.resource === 'volatiles' || prod.resource === 'isotopes' || prod.resource === 'water') {
    return prod.resource;
  }
  if (prod.resource === 'researchData' || prod.resource === 'habitability') return prod.resource;
  return null;
}
