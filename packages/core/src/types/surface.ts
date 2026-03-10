// ---------------------------------------------------------------------------
// Surface map types — 2D biosphere level
// ---------------------------------------------------------------------------
// Equirectangular projection of planet surface: terrain, biomes, buildings.
// Map is deterministically generated client-side from planet seed.
// ---------------------------------------------------------------------------

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

/** 256×128 equirectangular surface map */
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

/** Available building types */
export type BuildingType =
  | 'colony_hub'
  | 'mine'
  | 'solar_plant'
  | 'research_lab'
  | 'water_extractor'
  | 'greenhouse'
  | 'observatory';

/** Building definition (static config) */
export interface BuildingDef {
  type: BuildingType;
  name: string;
  description: string;
  size: number;                            // footprint (1 = 1×1)
  requiresTerrain: TerrainType[];          // allowed terrain types
  cost: { resource: string; amount: number }[];
}

/** A placed building on the surface */
export interface PlacedBuilding {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  level: number;
  builtAt: string; // ISO timestamp
}

/** Full surface state (persisted on server) */
export interface SurfaceState {
  planetId: string;
  playerId: string;
  buildings: PlacedBuilding[];
  resourceDeposits: SurfaceResourceDeposit[];
}

// ---------------------------------------------------------------------------
// Building definitions (static catalog)
// ---------------------------------------------------------------------------

const LAND_TERRAIN: TerrainType[] = ['lowland', 'plains', 'hills', 'beach'];
const WATER_TERRAIN: TerrainType[] = ['coast', 'ocean'];

export const BUILDING_DEFS: Record<BuildingType, BuildingDef> = {
  colony_hub: {
    type: 'colony_hub',
    name: 'Центр колонії',
    description: 'Головна база управління колонією',
    size: 1,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'Fe', amount: 50 }, { resource: 'Al', amount: 30 }],
  },
  mine: {
    type: 'mine',
    name: 'Шахта',
    description: 'Видобуток корисних копалин',
    size: 1,
    requiresTerrain: ['lowland', 'plains', 'hills'],
    cost: [{ resource: 'Fe', amount: 20 }],
  },
  solar_plant: {
    type: 'solar_plant',
    name: 'Сонячна станція',
    description: 'Генерація енергії від зірки',
    size: 1,
    requiresTerrain: ['lowland', 'plains', 'hills', 'beach'],
    cost: [{ resource: 'Si', amount: 30 }, { resource: 'Cu', amount: 10 }],
  },
  research_lab: {
    type: 'research_lab',
    name: 'Лабораторія',
    description: 'Наукові дослідження біосфери',
    size: 1,
    requiresTerrain: LAND_TERRAIN,
    cost: [{ resource: 'Ti', amount: 15 }, { resource: 'Cu', amount: 20 }],
  },
  water_extractor: {
    type: 'water_extractor',
    name: 'Водозбірник',
    description: 'Видобуток води з океану',
    size: 1,
    requiresTerrain: WATER_TERRAIN,
    cost: [{ resource: 'Fe', amount: 15 }, { resource: 'Cu', amount: 10 }],
  },
  greenhouse: {
    type: 'greenhouse',
    name: 'Теплиця',
    description: 'Вирощування їжі та рослин',
    size: 1,
    requiresTerrain: ['lowland', 'plains'],
    cost: [{ resource: 'Si', amount: 20 }, { resource: 'Al', amount: 15 }],
  },
  observatory: {
    type: 'observatory',
    name: 'Обсерваторія',
    description: 'Спостереження за космосом з поверхні',
    size: 1,
    requiresTerrain: ['hills', 'mountains'],
    cost: [{ resource: 'Ti', amount: 25 }, { resource: 'Si', amount: 20 }],
  },
};

/** Check if a building can be placed on a given tile */
export function canPlaceBuilding(def: BuildingDef, tile: SurfaceTile): boolean {
  return def.requiresTerrain.includes(tile.terrain);
}
