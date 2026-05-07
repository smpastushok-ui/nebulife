import type {
  BuildingType,
  PlacedBuilding,
  Planet,
  PlanetMissionPhaseDurations,
  PlanetMissionType,
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

export type BuildingEconomyRole =
  | 'hub'
  | 'energy'
  | 'extraction'
  | 'storage'
  | 'science'
  | 'biosphere'
  | 'chemistry'
  | 'logistics';

export interface BuildingEconomyProfile {
  role: BuildingEconomyRole;
  links: BuildingEconomyRole[];
  future: BuildingEconomyRole | 'none';
}

export interface BuildingPassiveEffect {
  id: string;
  labelKey: string;
  value: string;
  descKey: string;
  tone: 'science' | 'logistics' | 'resource' | 'safety' | 'energy';
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

export function hasActiveBuilding(buildings: PlacedBuilding[], type: BuildingType): boolean {
  return buildings.some((building) => building.type === type && !building.shutdown);
}

export function getPlanetMissionDurationMultiplier(type: PlanetMissionType, buildings: PlacedBuilding[]): number {
  let multiplier = 1;

  if (hasActiveBuilding(buildings, 'radar_tower')) {
    if (type === 'orbital_scan' || type === 'orbital_probe') multiplier *= 0.9;
    if (type === 'deep_atmosphere_probe') multiplier *= 0.88;
    if (type === 'drone_recon' || type === 'surface_landing') multiplier *= 0.93;
  }

  if (hasActiveBuilding(buildings, 'orbital_telescope') && (type === 'orbital_scan' || type === 'orbital_probe')) {
    multiplier *= 0.92;
  }

  if (hasActiveBuilding(buildings, 'research_lab')) {
    multiplier *= 0.96;
  }

  if (hasActiveBuilding(buildings, 'landing_pad') && type !== 'orbital_scan') {
    multiplier *= 0.95;
  }

  if (hasActiveBuilding(buildings, 'spaceport') && type !== 'orbital_scan') {
    multiplier *= 0.9;
  }

  if (hasActiveBuilding(buildings, 'quantum_computer')) {
    multiplier *= 0.9;
  }

  return Math.max(0.55, multiplier);
}

export function applyPlanetMissionDurationMultiplier<T extends PlanetMissionPhaseDurations>(
  durations: T,
  multiplier: number,
): T {
  return {
    preparing: Math.round(durations.preparing * multiplier),
    outbound: Math.round(durations.outbound * multiplier),
    orbital_insertion: Math.round(durations.orbital_insertion * multiplier),
    scan_or_landing: Math.round(durations.scan_or_landing * multiplier),
    data_downlink: Math.round(durations.data_downlink * multiplier),
  } as T;
}

function pctReduction(multiplier: number): string {
  return `-${Math.round((1 - multiplier) * 100)}%`;
}

export function getBuildingPassiveEffects(type: BuildingType, buildings: PlacedBuilding[]): BuildingPassiveEffect[] {
  const effects: BuildingPassiveEffect[] = [];

  const addMissionEffect = (id: string, missionType: PlanetMissionType, labelKey: string, descKey: string) => {
    const multiplier = getPlanetMissionDurationMultiplier(missionType, buildings);
    if (multiplier < 0.995) {
      effects.push({ id, labelKey, value: pctReduction(multiplier), descKey, tone: 'science' });
    }
  };

  if (type === 'radar_tower') {
    addMissionEffect('orbital-time', 'orbital_probe', 'building_detail.passive_effect.orbital_time', 'building_detail.passive_effect.orbital_time_desc');
    addMissionEffect('atmosphere-time', 'deep_atmosphere_probe', 'building_detail.passive_effect.atmosphere_time', 'building_detail.passive_effect.atmosphere_time_desc');
    addMissionEffect('surface-time', 'surface_landing', 'building_detail.passive_effect.surface_time', 'building_detail.passive_effect.surface_time_desc');
    effects.push(
      { id: 'deposit-accuracy', labelKey: 'building_detail.passive_effect.deposit_accuracy', value: '+18%', descKey: 'building_detail.passive_effect.deposit_accuracy_desc', tone: 'resource' },
      { id: 'hazard-map', labelKey: 'building_detail.passive_effect.hazard_map', value: '+12%', descKey: 'building_detail.passive_effect.hazard_map_desc', tone: 'safety' },
    );
  }

  if (type === 'observatory') {
    effects.push(
      { id: 'research-data', labelKey: 'building_detail.passive_effect.research_data', value: '+5/h', descKey: 'building_detail.passive_effect.research_data_desc', tone: 'science' },
      { id: 'signal-chance', labelKey: 'building_detail.passive_effect.signal_chance', value: '+10-40%', descKey: 'building_detail.passive_effect.signal_chance_desc', tone: 'science' },
    );
  }

  if (type === 'orbital_telescope') {
    addMissionEffect('orbital-time', 'orbital_probe', 'building_detail.passive_effect.orbital_time', 'building_detail.passive_effect.orbital_telescope_time_desc');
    effects.push({ id: 'system-discovery', labelKey: 'building_detail.passive_effect.system_discovery', value: '+10%', descKey: 'building_detail.passive_effect.system_discovery_desc', tone: 'science' });
  }

  if (type === 'research_lab') {
    addMissionEffect('science-time', 'surface_landing', 'building_detail.passive_effect.mission_analysis_time', 'building_detail.passive_effect.mission_analysis_time_desc');
    effects.push({ id: 'research-data', labelKey: 'building_detail.passive_effect.research_data', value: '+2/h', descKey: 'building_detail.passive_effect.lab_data_desc', tone: 'science' });
  }

  if (type === 'landing_pad') {
    addMissionEffect('payload-time', 'surface_landing', 'building_detail.passive_effect.payload_turnaround', 'building_detail.passive_effect.payload_turnaround_desc');
    effects.push({ id: 'mission-origin', labelKey: 'building_detail.passive_effect.local_launch', value: 'ON', descKey: 'building_detail.passive_effect.local_launch_desc', tone: 'logistics' });
  }

  if (type === 'spaceport') {
    addMissionEffect('heavy-time', 'surface_landing', 'building_detail.passive_effect.heavy_logistics_time', 'building_detail.passive_effect.heavy_logistics_time_desc');
    effects.push({ id: 'cargo-capacity', labelKey: 'building_detail.passive_effect.cargo_network', value: '+', descKey: 'building_detail.passive_effect.cargo_network_desc', tone: 'logistics' });
  }

  if (type === 'quantum_computer') {
    addMissionEffect('quantum-time', 'orbital_probe', 'building_detail.passive_effect.mission_analysis_time', 'building_detail.passive_effect.quantum_analysis_desc');
  }

  if (type === 'solar_plant' || type === 'battery_station' || type === 'wind_generator' || type === 'thermal_generator' || type === 'fusion_reactor') {
    effects.push({ id: 'grid-stability', labelKey: 'building_detail.passive_effect.grid_stability', value: type === 'battery_station' ? '+buffer' : '+power', descKey: 'building_detail.passive_effect.grid_stability_desc', tone: 'energy' });
  }

  if (type === 'mine' || type === 'water_extractor' || type === 'atmo_extractor' || type === 'deep_drill' || type === 'orbital_collector' || type === 'isotope_collector') {
    effects.push({ id: 'passive-extraction', labelKey: 'building_detail.passive_effect.passive_extraction', value: 'AUTO', descKey: 'building_detail.passive_effect.passive_extraction_desc', tone: 'resource' });
  }

  return effects;
}

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
    ...(def.energyConsumption > 0 ? [{ resource: 'energy', perHour: -toPerHour(def.energyConsumption) * count }] : []),
    ...def.consumption.map((c) => ({ resource: c.resource, perHour: -toPerHour(c.amount) * count })),
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

export function getBuildingEconomyProfile(type: BuildingType): BuildingEconomyProfile {
  if (type === 'colony_hub') {
    return { role: 'hub', links: ['storage', 'science', 'logistics'], future: 'logistics' };
  }
  if (type === 'resource_storage') {
    return { role: 'storage', links: ['extraction', 'chemistry', 'logistics'], future: 'logistics' };
  }
  if (type === 'landing_pad' || type === 'spaceport') {
    return { role: 'logistics', links: ['science', 'extraction', 'storage'], future: 'logistics' };
  }
  if (type === 'solar_plant' || type === 'battery_station' || type === 'wind_generator' || type === 'thermal_generator' || type === 'fusion_reactor') {
    return { role: 'energy', links: ['extraction', 'science', 'biosphere'], future: 'none' };
  }
  if (type === 'mine' || type === 'water_extractor' || type === 'atmo_extractor' || type === 'deep_drill' || type === 'orbital_collector' || type === 'isotope_collector' || type === 'alpha_harvester') {
    return { role: 'extraction', links: ['energy', 'storage', 'chemistry'], future: 'logistics' };
  }
  if (type === 'research_lab' || type === 'observatory' || type === 'radar_tower' || type === 'orbital_telescope' || type === 'quantum_computer') {
    return { role: 'science', links: ['energy', 'logistics', 'extraction'], future: 'science' };
  }
  if (type === 'greenhouse' || type === 'residential_dome' || type === 'atmo_shield' || type === 'biome_dome') {
    return { role: 'biosphere', links: ['energy', 'storage', 'science'], future: 'biosphere' };
  }
  return { role: 'chemistry', links: ['extraction', 'energy', 'science'], future: 'chemistry' };
}
