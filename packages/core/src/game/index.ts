export {
  calculateImpactTime,
  remainingTimeMs,
  remainingTimeFormatted,
  isPlanetDestroyed,
  remainingGameSeconds,
  formatGameTime,
  gameSecondsElapsed,
  BASE_TIME_MULTIPLIER,
  GAME_TOTAL_SECONDS,
} from './timeline.js';
export { travelTimeSeconds, travelTimeDays, distanceLY, launchDoomsdayShip, shipProgress } from './doomsday-ship.js';
export { isWithinExplorationRange, sortByDistance, rankColonizationTargets } from './exploration.js';
export {
  createResearchState,
  startResearch,
  completeResearchSession,
  cancelResearch,
  calculateObservation,
  canStartResearch,
  findFreeSlot,
  findBestSlotForSystem,
  getResearchProgress,
  isSystemFullyResearched,
  isRingFullyResearched,
  getSystemResearch,
  hasResearchData,
  findColonizablePlanet,
  findParadisePlanet,
  completeSystemResearchInstantly,
} from './research.js';

// Discovery system
export {
  rollForDiscovery,
  getDiscoveryChance,
  shouldForceDiscovery,
  RARITY_COLORS,
  RARITY_WEIGHTS,
  RARITY_LABELS,
} from './discovery.js';
export type {
  CosmicObjectCategory,
  GalleryCategory,
  DiscoveryRarity,
  Discovery,
} from './discovery.js';

// Cosmic catalog
export { COSMIC_CATALOG, getCatalogEntry, getCatalogByCategory, getCatalogByRarity } from './cosmic-catalog.js';
export type { CatalogEntry } from './cosmic-catalog.js';

// Prompt builder
export { buildPrompt, buildExpeditionPrompt } from './prompt-builder.js';

// Scientific reports
export { generateScientificReport } from './scientific-report.js';

// Technology tree
export {
  createTechTreeState,
  getBranchNodes,
  getTechNodeStatus,
  researchTech,
  getActiveEffects,
  getEffectValue,
  hasAvailableTech,
  ASTRONOMY_NODES,
  PHYSICS_NODES,
  CHEMISTRY_NODES,
  BIOLOGY_NODES,
  ALL_NODES,
} from './tech-tree.js';
export type {
  TechBranch,
  TechNodeStatus,
  TechNode,
  TechEffect,
  TechEffectType,
  TechTreeState,
} from './tech-tree.js';

// Planet building rules
export {
  canBuildOnPlanet,
  getAvailableBuildings,
  getTerrainBonus,
  getSolarEnergyMultiplier,
  getWindMultiplier,
  getAtmoMultiplier,
  planetHasAtmosphere,
} from './planet-rules.js';
export type { BuildingAvailability, TerrainBonus } from './planet-rules.js';

// Energy system
export {
  computeEnergyBalance,
  applyEnergyTick,
  restoreShutdownBuildings,
} from './energy.js';

// Colony tick
export { runColonyTicks } from './colony-tick.js';
export type { ColonyTickResult } from './colony-tick.js';

// Production system
export { startProduction, tickProduction } from './production.js';
export type { StartProductionResult, CompletedProduction } from './production.js';

// Proximity modifier system (ring-distance effects on all game mechanics)
export {
  computeProximityModifiers,
  getProximityModifiers,
} from './proximity.js';
export type {
  ProximityModifiers,
  ResearchProximityMods,
  TransportProximityMods,
  RocketProximityMods,
  MissionProximityMods,
  ColonyProximityMods,
  BuildingProximityMods,
} from './proximity.js';

// Element harvest (proportional element generation from hex surface harvests)
export { computeHarvestElements } from './element-harvest.js';

// Logistics
export {
  launchShip,
  tickShipTravel,
  loadCargo,
  unloadCargo,
  refuelShip,
  createTradeRoute,
} from './logistics.js';
export type { LaunchResult, ArrivalEvent } from './logistics.js';
