// ---------------------------------------------------------------------------
// Surface map types — 2D biosphere level
// ---------------------------------------------------------------------------
// Equirectangular projection of planet surface: terrain, biomes, buildings.
// Map is deterministically generated client-side from planet seed.
// ---------------------------------------------------------------------------

import type { PlanetType } from './planet.js';
import { RESEARCH_DATA_RATE } from '../constants/balance.js';

/** Terrain type determined by elevation noise sampling */
export type TerrainType =
  | 'deep_ocean'
  | 'ocean'
  | 'coast'
  | 'beach'
  | 'lowland'
  | 'plains'
  | 'hills'
  | 'mountains'
  | 'peaks'
  | 'volcano';

/** Biome determined by latitude + moisture (mirrors HomePlanetRenderer logic) */
export type BiomeType =
  | 'tropical_forest'
  | 'savanna'
  | 'desert'
  | 'temperate_forest'
  | 'grassland'
  | 'boreal_forest'
  | 'tundra'
  | 'ice'
  | 'wetland'
  | 'volcanic';

/** Single tile on the surface map */
export interface SurfaceTile {
  terrain: TerrainType;
  biome: BiomeType;
  elevation: number;       // raw noise value
  moisture: number;        // raw noise value
  latitude: number;        // 0..1 (absolute, 0=equator, 1=pole)
  buildable: boolean;      // can place land buildings here
  waterBuildable: boolean; // can place water structures here (coast/ocean)
}

/** 256x128 equirectangular surface map */
export interface SurfaceMap {
  width: number;    // 256
  height: number;   // 128
  tiles: SurfaceTile[];  // row-major: tiles[y * width + x]
  planetId: string;
  seed: number;
}

/** Resource deposit placed on a land tile */
export interface SurfaceResourceDeposit {
  id: string;
  x: number;          // tile x coordinate
  y: number;          // tile y coordinate
  element: string;    // 'Fe' | 'Cu' | 'Ni' | 'Ti' | 'U' | 'Al' | 'Si'
  abundance: number;  // 0..1
  depth: 'surface' | 'shallow' | 'deep';
}

/** Unique planet resource — finite, strategic, motivates multi-planet expansion */
export interface UniquePlanetResource {
  element: string;         // e.g. 'Au', 'Pt', 'W', 'Pu'
  totalAmount: number;     // finite, e.g. 500 units
  remaining: number;       // decreases as extracted
  extractionRate: number;  // per tick with deep_drill
  depth: 'shallow' | 'deep' | 'core';
}

// ---------------------------------------------------------------------------
// Building types — 27 buildings across 6 categories
// ---------------------------------------------------------------------------

export type BuildingCategory =
  | 'infrastructure'
  | 'energy'
  | 'extraction'
  | 'science'
  | 'biosphere'
  | 'chemistry';

/** All 28 available building types */
export type BuildingType =
  // Infrastructure (4)
  | 'colony_hub'
  | 'resource_storage'
  | 'landing_pad'
  | 'spaceport'
  // Energy (5)
  | 'solar_plant'
  | 'battery_station'
  | 'wind_generator'
  | 'thermal_generator'
  | 'fusion_reactor'
  // Extraction (6)
  | 'mine'
  | 'water_extractor'
  | 'atmo_extractor'
  | 'deep_drill'
  | 'orbital_collector'
  | 'isotope_collector'
  // Science & Recon (5)
  | 'research_lab'
  | 'observatory'
  | 'radar_tower'
  | 'orbital_telescope'
  | 'quantum_computer'
  // Biosphere & Defense (4)
  | 'greenhouse'
  | 'residential_dome'
  | 'atmo_shield'
  | 'biome_dome'
  // Chemistry & Synthesis (4)
  | 'quantum_separator'
  | 'gas_fractionator'
  | 'isotope_centrifuge'
  | 'genesis_vault'
  // Premium (purchased with quarks)
  | 'alpha_harvester';

/** What resource a building produces per tick */
export interface BuildingProduction {
  /** Resource key: 'minerals' | 'volatiles' | 'isotopes' | 'researchData' | 'energy' | 'habitability' */
  resource: string;
  /** Base amount per tick (before multipliers) */
  amount: number;
}

/** What resource a building consumes per tick */
export interface BuildingConsumption {
  resource: string;
  amount: number;
}

/** Adjacency synergy bonus — active when this building is next to a specific neighbor */
export interface AdjacencyBonus {
  neighbor: BuildingType;
  bonusLabel: string;   // UI display, e.g. '+20% дослідж.'
  bonusValue: number;   // multiplier delta, e.g. 0.20 = +20%
}

/** Building definition (static config) */
export interface BuildingDef {
  type: BuildingType;
  category: BuildingCategory;
  name: string;
  description: string;
  size: number;                            // footprint max dim, legacy compat
  sizeW: number;                           // footprint cells in X
  sizeH: number;                           // footprint cells in Z
  requiresTerrain: TerrainType[];          // allowed terrain types
  cost: { resource: string; amount: number }[];
  adjacencyBonuses?: AdjacencyBonus[];     // synergy bonuses when adjacent to these types
  // --- New fields ---
  levelRequired: number;                   // min player level to build
  techRequired: string | null;             // tech node ID that must be researched (null = no tech needed)
  maxPerPlanet: number;                    // max instances per planet (0 = unlimited)
  energyOutput: number;                    // energy produced per tick (positive)
  energyConsumption: number;               // energy consumed per tick (positive value = consumes)
  energyStorageAdd: number;                // bonus to energy storage capacity
  production: BuildingProduction[];        // resources produced per tick
  consumption: BuildingConsumption[];      // resources consumed per tick (e.g. fusion consumes isotopes)
  allowedPlanetTypes: PlanetType[];        // which planet types allow this building
  requiresAtmosphere: boolean;             // can only build on planets with atmosphere
  storageCapacityAdd: number;              // bonus to resource storage (resource_storage modules)
  populationCapacityAdd: number;           // bonus to population cap (residential_dome)
  fogRevealRadius: number;                 // radius of fog reveal (radar_tower)
}

/** A placed building on the surface */
export interface PlacedBuilding {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  level: number;
  builtAt: string; // ISO timestamp
  /** For resource_storage: which type this module stores */
  storageSlotType?: 'minerals' | 'volatiles' | 'isotopes';
  /** Whether building is currently shut down due to energy deficit */
  shutdown?: boolean;
}

/** Full surface state (persisted on server) */
export interface SurfaceState {
  planetId: string;
  playerId: string;
  buildings: PlacedBuilding[];
  resourceDeposits: SurfaceResourceDeposit[];
  uniqueResources?: UniquePlanetResource[];
}

// ---------------------------------------------------------------------------
// Terrain helpers
// ---------------------------------------------------------------------------

const LAND_TERRAIN: TerrainType[] = ['lowland', 'plains', 'beach'];
const FLAT_LAND: TerrainType[]    = ['lowland', 'plains'];
const WATER_TERRAIN: TerrainType[] = ['coast', 'ocean'];
const HIGH_TERRAIN: TerrainType[] = ['hills', 'mountains'];
const HIGH_PLUS_PEAKS: TerrainType[] = ['hills', 'mountains', 'peaks'];
const VOLCANIC_HIGH: TerrainType[] = ['volcano', 'hills', 'mountains'];
const ALL_TERRAIN: TerrainType[] = [
  'deep_ocean', 'ocean', 'coast', 'beach', 'lowland',
  'plains', 'hills', 'mountains', 'peaks', 'volcano',
];

const ROCKY_DWARF: PlanetType[] = ['rocky', 'terrestrial', 'dwarf'];
const ROCKY_ONLY: PlanetType[] = ['rocky', 'terrestrial'];
const TERRESTRIAL_ONLY: PlanetType[] = ['terrestrial'];
const ROCKY_ICE: PlanetType[] = ['rocky', 'terrestrial', 'ice-giant'];
const GAS_ICE: PlanetType[] = ['gas-giant', 'ice-giant'];
const ALL_PLANETS: PlanetType[] = ['rocky', 'terrestrial', 'dwarf', 'gas-giant', 'ice-giant'];

// ---------------------------------------------------------------------------
// Building definitions (static catalog) — 28 buildings
// ---------------------------------------------------------------------------

export const BUILDING_DEFS: Record<BuildingType, BuildingDef> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // INFRASTRUCTURE (4)
  // ═══════════════════════════════════════════════════════════════════════════
  colony_hub: {
    type: 'colony_hub', category: 'infrastructure',
    name: 'Центр колонії',
    description: 'Головна база. Вбудована обсерваторія (+1 дані/год), 500 жителів, +5 енергії.',
    size: 3, sizeW: 3, sizeH: 3,
    requiresTerrain: LAND_TERRAIN,
    cost: [],   // free, auto-placed on ring 0
    adjacencyBonuses: [
      { neighbor: 'greenhouse', bonusLabel: '+10% харч.', bonusValue: 0.10 },
    ],
    levelRequired: 1, techRequired: null, maxPerPlanet: 1,
    energyOutput: 5, energyConsumption: 0, energyStorageAdd: 0,
    production: [{ resource: 'researchData', amount: RESEARCH_DATA_RATE }], // 1 data/hour
    consumption: [],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 500, fogRevealRadius: 30,
  },

  resource_storage: {
    type: 'resource_storage', category: 'infrastructure',
    name: 'Ресурсний модуль',
    description: 'Розширює ємність сховища на +200 для обраного типу ресурсу.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 12 }, { resource: 'volatiles', amount: 5 }],
    levelRequired: 3, techRequired: null, maxPerPlanet: 6,
    energyOutput: 0, energyConsumption: 0, energyStorageAdd: 0,
    production: [], consumption: [],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 200, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  landing_pad: {
    type: 'landing_pad', category: 'infrastructure',
    name: 'Посадковий майданчик',
    description: 'Прийом малих кораблів, дронів та вантажів з орбіти.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: FLAT_LAND,
    cost: [{ resource: 'minerals', amount: 25 }, { resource: 'volatiles', amount: 15 }, { resource: 'isotopes', amount: 5 }],
    levelRequired: 18, techRequired: 'phy-thrust-1', maxPerPlanet: 2,
    energyOutput: 0, energyConsumption: 2, energyStorageAdd: 0,
    production: [], consumption: [],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  spaceport: {
    type: 'spaceport', category: 'infrastructure',
    name: 'Космопорт',
    description: 'Будівництво та запуск кораблів. Потребує посадковий майданчик.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: FLAT_LAND,
    cost: [{ resource: 'minerals', amount: 50 }, { resource: 'volatiles', amount: 30 }, { resource: 'isotopes', amount: 10 }],
    levelRequired: 35, techRequired: 'phy-orbital-mech', maxPerPlanet: 1,
    energyOutput: 0, energyConsumption: 8, energyStorageAdd: 0,
    production: [], consumption: [],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENERGY (5)
  // ═══════════════════════════════════════════════════════════════════════════
  solar_plant: {
    type: 'solar_plant', category: 'energy',
    name: 'Сонячна станція',
    description: 'Генерація енергії від зірки. Ефективність залежить від відстані.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 8 }],
    adjacencyBonuses: [
      { neighbor: 'mine', bonusLabel: '+15% видоб.', bonusValue: 0.15 },
    ],
    levelRequired: 1, techRequired: null, maxPerPlanet: 12,
    energyOutput: 8, energyConsumption: 0, energyStorageAdd: 0,
    production: [], consumption: [],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  battery_station: {
    type: 'battery_station', category: 'energy',
    name: 'Акумуляторна',
    description: 'Зберігає надлишки енергії. +100 ємності енерго-сховища.',
    size: 1, sizeW: 1, sizeH: 1,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 10 }, { resource: 'volatiles', amount: 5 }],
    levelRequired: 6, techRequired: 'phy-capacitor', maxPerPlanet: 4,
    energyOutput: 0, energyConsumption: 0, energyStorageAdd: 100,
    production: [], consumption: [],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  wind_generator: {
    type: 'wind_generator', category: 'energy',
    name: 'Вітрогенератор',
    description: 'Енергія з вітру. Потребує атмосферу. Вихід залежить від тиску.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: ['lowland', 'plains', 'beach'],
    cost: [{ resource: 'minerals', amount: 12 }, { resource: 'volatiles', amount: 5 }],
    levelRequired: 8, techRequired: 'phy-aero', maxPerPlanet: 8,
    energyOutput: 6, energyConsumption: 0, energyStorageAdd: 0,
    production: [], consumption: [],
    allowedPlanetTypes: ROCKY_ONLY, requiresAtmosphere: true,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  thermal_generator: {
    type: 'thermal_generator', category: 'energy',
    name: 'Термогенератор',
    description: 'Стабільна енергія з геотермальних джерел. Бонус на вулканах.',
    size: 1, sizeW: 1, sizeH: 1,
    requiresTerrain: VOLCANIC_HIGH,
    cost: [{ resource: 'minerals', amount: 15 }, { resource: 'volatiles', amount: 8 }, { resource: 'isotopes', amount: 2 }],
    levelRequired: 10, techRequired: 'phy-thermo-1', maxPerPlanet: 4,
    energyOutput: 15, energyConsumption: 0, energyStorageAdd: 0,
    production: [], consumption: [],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  fusion_reactor: {
    type: 'fusion_reactor', category: 'energy',
    name: 'Синтезатор плазми',
    description: 'Термоядерна енергія. +50 енергії. Споживає ізотопи.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 70 }, { resource: 'volatiles', amount: 40 }, { resource: 'isotopes', amount: 15 }, { resource: 'U', amount: 8 }],
    levelRequired: 42, techRequired: 'phy-fusion', maxPerPlanet: 2,
    energyOutput: 50, energyConsumption: 0, energyStorageAdd: 0,
    production: [],
    consumption: [{ resource: 'isotopes', amount: 0.1 }, { resource: 'water', amount: 0.05 }], // cooling
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTRACTION (5)
  // ═══════════════════════════════════════════════════════════════════════════
  mine: {
    type: 'mine', category: 'extraction',
    name: 'Шахта',
    description: 'Видобуток базових мінералів з поверхневих покладів.',
    size: 1, sizeW: 1, sizeH: 1,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 5 }],
    levelRequired: 1, techRequired: null, maxPerPlanet: 10,
    energyOutput: 0, energyConsumption: 3, energyStorageAdd: 0,
    production: [{ resource: 'minerals', amount: 2 }],
    consumption: [],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  water_extractor: {
    type: 'water_extractor', category: 'extraction',
    name: 'Водозбірник',
    description: 'Видобуток води з океану та узбережжя. Вода для життєзабезпечення та охолодження.',
    size: 1, sizeW: 1, sizeH: 1,
    requiresTerrain: WATER_TERRAIN,
    cost: [{ resource: 'minerals', amount: 5 }, { resource: 'volatiles', amount: 3 }],
    levelRequired: 1, techRequired: null, maxPerPlanet: 6,
    energyOutput: 0, energyConsumption: 2, energyStorageAdd: 0,
    production: [{ resource: 'water', amount: 1 }],
    consumption: [],
    allowedPlanetTypes: ROCKY_ICE, requiresAtmosphere: false, // needs water sources
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  atmo_extractor: {
    type: 'atmo_extractor', category: 'extraction',
    name: 'Атмосферний конденсатор',
    description: 'Збір летючих з атмосфери. Вихід залежить від тиску.',
    size: 1, sizeW: 1, sizeH: 1,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 15 }, { resource: 'volatiles', amount: 10 }, { resource: 'isotopes', amount: 2 }],
    levelRequired: 12, techRequired: 'chem-gas-sep', maxPerPlanet: 4,
    energyOutput: 0, energyConsumption: 4, energyStorageAdd: 0,
    production: [{ resource: 'volatiles', amount: 2 }],
    consumption: [],
    allowedPlanetTypes: ROCKY_ONLY, requiresAtmosphere: true,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  deep_drill: {
    type: 'deep_drill', category: 'extraction',
    name: 'Глибинний бур',
    description: 'Доступ до глибоких покладів. Шанс рідкісних елементів.',
    size: 1, sizeW: 1, sizeH: 1,
    requiresTerrain: HIGH_TERRAIN,
    cost: [{ resource: 'minerals', amount: 25 }, { resource: 'volatiles', amount: 12 }, { resource: 'isotopes', amount: 3 }],
    levelRequired: 20, techRequired: 'phy-drill', maxPerPlanet: 3,
    energyOutput: 0, energyConsumption: 6, energyStorageAdd: 0,
    production: [{ resource: 'minerals', amount: 3 }],
    consumption: [{ resource: 'water', amount: 0.02 }], // cooling
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  orbital_collector: {
    type: 'orbital_collector', category: 'extraction',
    name: 'Орбітальний збирач',
    description: 'Єдиний видобуток для газових/крижаних гігантів.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: ALL_TERRAIN,
    cost: [{ resource: 'minerals', amount: 40 }, { resource: 'volatiles', amount: 20 }, { resource: 'isotopes', amount: 8 }],
    levelRequired: 30, techRequired: 'chem-orbital', maxPerPlanet: 2,
    energyOutput: 0, energyConsumption: 5, energyStorageAdd: 0,
    production: [{ resource: 'volatiles', amount: 4 }],
    consumption: [],
    allowedPlanetTypes: GAS_ICE, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  isotope_collector: {
    type: 'isotope_collector', category: 'extraction',
    name: 'Збирач ізотопів',
    description: 'Пасивний видобуток ізотопів з космічного випромінювання. 9 ISO/год.',
    size: 1, sizeW: 1, sizeH: 1,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 12 }, { resource: 'volatiles', amount: 5 }],
    levelRequired: 6, techRequired: null, maxPerPlanet: 3,
    energyOutput: 0, energyConsumption: 3, energyStorageAdd: 0,
    production: [{ resource: 'isotopes', amount: 0.15 }], // 9 isotopes/hour (60 ticks)
    consumption: [],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCIENCE & RECON (5)
  // ═══════════════════════════════════════════════════════════════════════════
  research_lab: {
    type: 'research_lab', category: 'science',
    name: 'Лабораторія',
    description: 'Наукові дослідження. Генерує дані досліджень.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 8 }, { resource: 'volatiles', amount: 5 }],
    adjacencyBonuses: [
      { neighbor: 'observatory', bonusLabel: '+20% дослідж.', bonusValue: 0.20 },
      { neighbor: 'greenhouse',  bonusLabel: '+10% біо',      bonusValue: 0.10 },
    ],
    levelRequired: 5, techRequired: null, maxPerPlanet: 4,
    energyOutput: 0, energyConsumption: 3, energyStorageAdd: 0,
    production: [{ resource: 'researchData', amount: RESEARCH_DATA_RATE }], // 1 data/hour
    consumption: [],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  observatory: {
    type: 'observatory', category: 'science',
    name: 'Обсерваторія',
    description: 'Спостереження за космосом. Слоти для сесій досліджень.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: HIGH_TERRAIN,
    cost: [{ resource: 'minerals', amount: 10 }, { resource: 'volatiles', amount: 5 }, { resource: 'isotopes', amount: 2 }],
    levelRequired: 2, techRequired: 'ast-radio-1', maxPerPlanet: 5, // 3 base + tech unlocks
    energyOutput: 0, energyConsumption: 2, energyStorageAdd: 0,
    production: [], // observatory provides research session slots, not per-tick production
    consumption: [],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  radar_tower: {
    type: 'radar_tower', category: 'science',
    name: 'Радарна вежа',
    description: 'Розсіює туман війни у радіусі 32 клітин. Виявляє приховані поклади.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: HIGH_PLUS_PEAKS,
    cost: [{ resource: 'minerals', amount: 18 }, { resource: 'volatiles', amount: 10 }, { resource: 'isotopes', amount: 3 }],
    levelRequired: 14, techRequired: 'phy-em-field', maxPerPlanet: 2,
    energyOutput: 0, energyConsumption: 4, energyStorageAdd: 0,
    production: [], consumption: [],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 32,
  },

  orbital_telescope: {
    type: 'orbital_telescope', category: 'science',
    name: 'Орбітальний телескоп',
    description: 'Генерує 3 дані досліджень за тік. +10% відкриттів у системі.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: ALL_TERRAIN,
    cost: [{ resource: 'minerals', amount: 45 }, { resource: 'volatiles', amount: 25 }, { resource: 'isotopes', amount: 8 }],
    levelRequired: 28, techRequired: 'ast-deep-radar', maxPerPlanet: 1,
    energyOutput: 0, energyConsumption: 6, energyStorageAdd: 0,
    production: [{ resource: 'researchData', amount: RESEARCH_DATA_RATE * 3 }], // 3 data/hour
    consumption: [],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  quantum_computer: {
    type: 'quantum_computer', category: 'science',
    name: 'Квантовий комп\'ютер',
    description: 'Генерує 5 даних досліджень за тік. Зменшує час досліджень на 20%.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 60 }, { resource: 'volatiles', amount: 35 }, { resource: 'isotopes', amount: 10 }, { resource: 'Ti', amount: 5 }],
    levelRequired: 38, techRequired: 'phy-quantum', maxPerPlanet: 1,
    energyOutput: 0, energyConsumption: 10, energyStorageAdd: 0,
    production: [{ resource: 'researchData', amount: RESEARCH_DATA_RATE * 5 }], // 5 data/hour
    consumption: [{ resource: 'water', amount: 0.03 }], // cooling
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BIOSPHERE & DEFENSE (4)
  // ═══════════════════════════════════════════════════════════════════════════
  greenhouse: {
    type: 'greenhouse', category: 'biosphere',
    name: 'Теплиця',
    description: 'Вирощування їжі. Підвищує придатність для життя.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 6 }, { resource: 'volatiles', amount: 4 }],
    levelRequired: 3, techRequired: null, maxPerPlanet: 8,
    energyOutput: 0, energyConsumption: 2, energyStorageAdd: 0,
    production: [{ resource: 'habitability', amount: 0.005 }],
    consumption: [{ resource: 'water', amount: 0.03 }],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  residential_dome: {
    type: 'residential_dome', category: 'biosphere',
    name: 'Житловий купол',
    description: 'Житлові модулі для екіпажу. +500 населення.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 20 }, { resource: 'volatiles', amount: 12 }, { resource: 'isotopes', amount: 3 }],
    levelRequired: 15, techRequired: 'bio-life-support', maxPerPlanet: 4,
    energyOutput: 0, energyConsumption: 4, energyStorageAdd: 0,
    production: [], consumption: [{ resource: 'water', amount: 0.05 }],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 500, fogRevealRadius: 0,
  },

  atmo_shield: {
    type: 'atmo_shield', category: 'biosphere',
    name: 'Атмосферний щит',
    description: 'Захист колонії від ворожої атмосфери та метеоритів.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: ALL_TERRAIN,
    cost: [{ resource: 'minerals', amount: 40 }, { resource: 'volatiles', amount: 25 }, { resource: 'isotopes', amount: 8 }],
    levelRequired: 25, techRequired: 'bio-terraforming', maxPerPlanet: 1,
    energyOutput: 0, energyConsumption: 8, energyStorageAdd: 0,
    production: [], consumption: [],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  biome_dome: {
    type: 'biome_dome', category: 'biosphere',
    name: 'Біосферний купол',
    description: 'Самодостатня біосфера. Еквівалент 3 теплиць.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 35 }, { resource: 'volatiles', amount: 20 }, { resource: 'isotopes', amount: 5 }],
    levelRequired: 32, techRequired: 'bio-biome-eng', maxPerPlanet: 2,
    energyOutput: 0, energyConsumption: 6, energyStorageAdd: 0,
    production: [{ resource: 'habitability', amount: 0.015 }],
    consumption: [{ resource: 'water', amount: 0.05 }], // life support
    allowedPlanetTypes: TERRESTRIAL_ONLY, requiresAtmosphere: false, // needs biosphere-capable planet
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHEMISTRY & SYNTHESIS (4)
  // ═══════════════════════════════════════════════════════════════════════════
  quantum_separator: {
    type: 'quantum_separator', category: 'chemistry',
    name: 'Квантовий сепаратор',
    description: 'Розщеплення мінералів на хімічні елементи. 10 мін -> 5 елементів.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 30 }, { resource: 'volatiles', amount: 15 }, { resource: 'isotopes', amount: 5 }],
    levelRequired: 22, techRequired: 'chem-q-sep', maxPerPlanet: 2,
    energyOutput: 0, energyConsumption: 5, energyStorageAdd: 0,
    production: [], // batch processing, handled by production.ts
    consumption: [{ resource: 'minerals', amount: 2 }], // 10 per 5 ticks
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  gas_fractionator: {
    type: 'gas_fractionator', category: 'chemistry',
    name: 'Газовий фракціонатор',
    description: 'Переробка летючих на хімічні елементи. 10 лет -> 5 елементів.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 35 }, { resource: 'volatiles', amount: 20 }, { resource: 'isotopes', amount: 5 }],
    levelRequired: 26, techRequired: 'chem-fraction', maxPerPlanet: 2,
    energyOutput: 0, energyConsumption: 6, energyStorageAdd: 0,
    production: [],
    consumption: [{ resource: 'volatiles', amount: 2 }], // 10 per 5 ticks
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  isotope_centrifuge: {
    type: 'isotope_centrifuge', category: 'chemistry',
    name: 'Ізотопна центрифуга',
    description: 'Збагачення ізотопів. 5 ізо -> 2 U. Критично для термояд реактора.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 50 }, { resource: 'volatiles', amount: 25 }, { resource: 'isotopes', amount: 8 }, { resource: 'U', amount: 3 }],
    levelRequired: 36, techRequired: 'chem-isotope', maxPerPlanet: 2,
    energyOutput: 0, energyConsumption: 8, energyStorageAdd: 0,
    production: [],
    consumption: [{ resource: 'isotopes', amount: 1 }], // 5 per 5 ticks
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  genesis_vault: {
    type: 'genesis_vault', category: 'chemistry',
    name: 'Ковчег Генезису',
    description: 'Мегаструктура для зберігання ДНК та терраформування. +0.15 придатність.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'minerals', amount: 120 }, { resource: 'volatiles', amount: 50 }, { resource: 'isotopes', amount: 20 }, { resource: 'U', amount: 10 }, { resource: 'Pt', amount: 3 }],
    levelRequired: 48, techRequired: 'bio-genesis', maxPerPlanet: 1,
    energyOutput: 0, energyConsumption: 15, energyStorageAdd: 0,
    production: [{ resource: 'habitability', amount: 0.015 }],
    consumption: [],
    allowedPlanetTypes: ROCKY_DWARF, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PREMIUM (purchased with quarks — 1)
  // ═══════════════════════════════════════════════════════════════════════════
  alpha_harvester: {
    type: 'alpha_harvester', category: 'extraction',
    name: 'Альфа-добувач',
    description: 'Преміум дрон-збирач. Автоматично збирає ресурси в радіусі 10 клітинок. Куплено за кварки.',
    size: 2, sizeW: 2, sizeH: 2,
    requiresTerrain: FLAT_LAND,
    cost: [],   // Purchased with quarks via shop — not built with standard resources
    levelRequired: 1, techRequired: null, maxPerPlanet: 1,
    energyOutput: 0, energyConsumption: 5, energyStorageAdd: 0,
    production: [
      { resource: 'minerals', amount: 1 },
      { resource: 'volatiles', amount: 1 },
    ],
    consumption: [],
    allowedPlanetTypes: ALL_PLANETS, requiresAtmosphere: false,
    storageCapacityAdd: 0, populationCapacityAdd: 0, fogRevealRadius: 0,
  },
};

// ---------------------------------------------------------------------------
// Harvest / regrowth system
// ---------------------------------------------------------------------------

/** Types of harvestable objects on the surface. */
export type SurfaceObjectType = 'tree' | 'ore' | 'vent' | 'water';

/** Stage of a tree cell after being harvested. */
export type CellHarvestState = 'stump' | 'grass' | 'tree-small';

/** Stage of an ore deposit after being harvested. */
export type OreHarvestState = 'depleted' | 'ore-small';

/** Stage of a vent after being harvested. */
export type VentHarvestState = 'dry' | 'vent-small';

/**
 * Override state for a grid cell that has been harvested.
 * Stored in localStorage and used by SurfaceScene to override the default tile.
 *
 * Regrowth cycles:
 *   tree: stump -> grass -> tree-small -> tree (removed) -- 1h per stage
 *   ore:  depleted -> ore-small -> ore (removed)         -- 1h per stage
 *   vent: dry -> vent-small -> vent (removed)             -- 2h per stage
 */
export interface HarvestedCell {
  objectType?:  SurfaceObjectType;  // 'tree' if undefined (backward compat)
  state:        CellHarvestState | OreHarvestState | VentHarvestState;
  grassVariant: number;   // 0-2 -> atlas frame 10/11/12 (deterministic per cell)
  treeVariant:  number;   // 0-2 -> atlas frame 13/14/15 (or ore 18-20, vent 21-23)
  changedAt:    number;   // Date.now() ms -- when state last changed
}

/** Regrowth duration per stage in milliseconds, keyed by object type. */
export const REGROWTH_STAGE_MS: Record<SurfaceObjectType, number> = {
  tree:  3_600_000,   // 1 hour per stage (3 stages = 3h total)
  ore:   3_600_000,   // 1 hour per stage (2 stages = 2h total)
  vent:  7_200_000,   // 2 hours per stage (2 stages = 4h total)
  water: 5_400_000,   // 1.5 hours per stage (2 stages = 3h total)
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a building can be placed on a given tile */
export function canPlaceBuilding(def: BuildingDef, tile: SurfaceTile): boolean {
  return def.requiresTerrain.includes(tile.terrain);
}

/**
 * Returns active adjacency bonuses for each building in the list.
 * A bonus is active when a building's bonusNeighbor type is directly adjacent (4-dir).
 * Returns: buildingId -> list of active AdjacencyBonus entries
 */
export function getActiveBonuses(
  buildings: PlacedBuilding[],
): Map<string, AdjacencyBonus[]> {
  const result = new Map<string, AdjacencyBonus[]>();
  for (const b of buildings) {
    const def = BUILDING_DEFS[b.type];
    if (!def.adjacencyBonuses?.length) continue;
    const neighbors = buildings.filter(
      (n) =>
        (Math.abs(n.x - b.x) === 1 && n.y === b.y) ||
        (n.x === b.x && Math.abs(n.y - b.y) === 1),
    );
    const active = def.adjacencyBonuses.filter((bon) =>
      neighbors.some((n) => n.type === bon.neighbor),
    );
    if (active.length > 0) result.set(b.id, active);
  }
  return result;
}
