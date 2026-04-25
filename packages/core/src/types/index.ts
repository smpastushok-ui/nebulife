export type { OrbitalParameters } from './orbit.js';
export type { Star } from './star.js';
export type { Planet, PlanetType, PlanetSize, Moon, MoonComposition } from './planet.js';
export { getPlanetSize } from './planet.js';
export type { Universe, Galaxy, GalaxyRing, StarSystem, AsteroidBelt } from './universe.js';
export type { Player, DoomsdayShip, GamePhase } from './player.js';
export type { GlobalResources, ColonyResources, ChemicalInventory, PlayerProfile } from './resources.js';
export type { ObservedRange, SystemObservation, SystemResearchState, ResearchSlot, ResearchState } from './research.js';
export type {
  TerrainType, BiomeType, SurfaceTile, SurfaceMap,
  SurfaceResourceDeposit, UniquePlanetResource,
  BuildingCategory, BuildingType, BuildingProduction, BuildingConsumption,
  BuildingDef, AdjacencyBonus,
  PlacedBuilding, SurfaceState,
  SurfaceObjectType, CellHarvestState, OreHarvestState, VentHarvestState, HarvestedCell,
} from './surface.js';
export { BUILDING_DEFS, canPlaceBuilding, getActiveBonuses, REGROWTH_STAGE_MS } from './surface.js';
export type {
  PlanetEnergyState, StorageState, PopulationState, PlanetColonyState,
} from './colony.js';
export {
  createEnergyState, createStorageState, getStorageCapacity,
  createPopulationState, createPlanetColonyState,
} from './colony.js';
export type {
  ProducibleType, ProducibleDef, ProductionQueueItem,
  ShipStatus, DeployableUnit, CargoManifest, Ship,
  TradeRoute, FleetState,
} from './logistics.js';
export {
  PRODUCIBLE_DEFS, getProductionProgress, isProductionComplete,
  createEmptyManifest, createFleetState,
} from './logistics.js';
export type { CoreSystem, GalaxyGroupCore, GalaxyGroup } from './galaxy-group.js';
export type { GalacticPosition, GalaxyGroupMeta, PlayerGalaxyAssignment } from './galaxy-map.js';
export type {
  TopicCategoryId, DifficultyTier, QuestType,
  TopicCategory, TopicSubcategory, TopicLesson,
  QuestCriteria, EducationQuest, EducationQuiz,
  DailyEducationPackage, ActiveQuest,
  CategoryProgressEntry, AcademyProgress,
} from './education.js';
export type {
  TerraformParamId,
  TerraformParamState,
  PlanetTerraformState,
  ShipTier,
  MissionPhase,
  Mission,
  ResourceCost,
  PlanetOverride,
} from './terraform.js';
