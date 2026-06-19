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
  RARITY_LABELS_UK,
  RARITY_LABELS_EN,
  getRarityLabel,
} from './discovery.js';
export type {
  CosmicObjectCategory,
  GalleryCategory,
  DiscoveryRarity,
  Discovery,
} from './discovery.js';

// Lifeform Genesis module
export {
  LIFEFORM_PHOTO_COST,
  LIFEFORM_PHOTO_ADS,
  LIFEFORM_VIDEO_COST,
  LIFEFORM_FIND_WEIGHTS,
  LIFEFORM_HARVEST_FIND_CHANCE,
  LIFEFORM_FIND_COOLDOWN_MS,
  LIFEFORM_TRIGGER_BUILDINGS,
  isLifeformTriggerBuilding,
  rollLifeformFind,
  rollLifeformHarvestFind,
  LIFEFORM_INGREDIENT_IDS,
  INGREDIENT_BY_DEPOSIT,
  GENESIS_INGREDIENT_MIN_LEVEL,
  isRareIngredient,
  rollIngredientDrop,
  LIFE_SPARK_TYPES,
  GENESIS_COMPLEXITY_RECIPE,
  canSynthesizeComplexity,
  rollLifeSparkDrop,
  synthesizeGenesisGenome,
  LIFEFORM_CREATE_RECIPE,
  canCreateLifeform,
  buildLifeformPlanetContext,
  // Simple (common, bundled) lifeform catalogue
  SIMPLE_LIFEFORMS,
  SIMPLE_LIFEFORM_COUNT,
  SIMPLE_LIFEFORM_ASSET_BASE,
  getSimpleLifeform,
  simpleLifeformPhoto,
  simpleLifeformVideo,
  simpleLifeformName,
  simpleKeyFromAssetUrl,
  pickUnseenSimpleLifeform,
} from './lifeform.js';
export type {
  LifeformSource,
  LifeformMediaStatus,
  LifeformFindRoll,
  LifeformIngredientId,
  LifeformCreateRecipe,
  LifeSparkType,
  LifeSparkInventory,
  LifeComplexityTier,
  SparkDropRoll,
  GenesisSparkRecipe,
  GenesisElementInput,
  GenesisGenome,
  LifeformPlanetContext,
  SimpleLifeform,
} from './lifeform.js';

// Cosmic catalog
export {
  COSMIC_CATALOG,
  getCatalogEntry,
  getCatalogByCategory,
  getCatalogByRarity,
  getCatalogName,
  getCatalogDescription,
} from './cosmic-catalog.js';
export type { CatalogEntry } from './cosmic-catalog.js';

// Observatory event search
export {
  OBSERVATORY_SEARCH_DURATION_MS,
  createObservatoryState,
  normalizeObservatoryState,
  getObservatoryLevel,
  getObservatoryMaxActiveSearches,
  getObservatoryXpProgress,
  getAvailableObservatoryPrograms,
  getObservatorySearchChance,
  startObservatorySearch,
  completeObservatorySearch,
  completeReadyObservatorySearches,
  rollObservatoryDiscovery,
  estimateObservatoryCompletionDays,
} from './observatory-search.js';
export type { ObservatorySearchResult } from './observatory-search.js';

// Comet Herald live event
export {
  COMET_CYCLE_DAYS,
  COMET_REWARD_QUARKS,
  COMET_REWARD_XP,
  COMET_REWARD_RESOURCES,
  COMET_CATALOG_TYPE,
  COMET_TRACKING_DURATION_MS,
  cometHash,
  getCometSchedule,
  cometClaimKey,
} from './comet-event.js';
export type { CometSchedule } from './comet-event.js';

// Daily directives
export {
  DIRECTIVE_POOL,
  DAILY_DIRECTIVE_COUNT,
  DIRECTIVE_REWARD_QUARKS,
  DIRECTIVE_STREAK_REWARD_QUARKS,
  DIRECTIVE_STREAK_LENGTH,
  utcDayString,
  pickDailyDirectives,
  createDailyDirectiveState,
  normalizeDailyDirectiveState,
  bumpDirectiveMetric,
  isDirectiveDone,
  areAllDirectivesDone,
} from './daily-directives.js';
export type { DirectiveMetric, DirectiveDef, DailyDirectiveState } from './daily-directives.js';

// Quantum separator — bulk → element separation batches
export {
  SEPARATION_BATCH,
  SEPARATION_DURATION_MS,
  SEPARATION_RESEARCH_DATA_COST,
  getSeparationElements,
  rollSeparation,
} from './separation.js';
export type { SeparationGroup, SeparationJob } from './separation.js';

// Research lab — particle extraction + spark-of-life DNA minigame tiers
export {
  EXTRACTION_BATCH,
  EXTRACTION_DURATION_MS,
  EXTRACTION_RESEARCH_DATA_COST,
  EXTRACTION_YIELD_COUNT,
  rollParticleExtraction,
  getExtractionElements,
  SPARK_DIFFICULTY,
} from './lab.js';
export type { ExtractionJob, SparkDifficulty } from './lab.js';

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
export { runColonyTicks, getBuildingEnergyMultiplier } from './colony-tick.js';
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

// Planet exploration missions
export {
  isSolidPlanetForLanding,
  getTargetRevealLevel,
  getRequiredMissionBuilding,
  getRequiredMissionCarrier,
  computePlanetMissionCost,
  computePlanetMissionDuration,
  sumPlanetMissionDuration,
  getPlanetMissionProgress,
  canStartPlanetMission,
  createPlanetMission,
  completePlanetMission,
} from './planet-exploration.js';
export type { PlanetMissionResources, PlanetMissionStartCheck } from './planet-exploration.js';

// Terraforming rules
export {
  isTerraformable,
  getInitialTerraformState,
  computeParamRequirement,
  supplyRunsRemaining,
  applyDelivery,
  getOverallProgress,
  canStartParam,
  applyTerraformCompletionToPlanet,
} from './terraform-rules.js';

// Fleet rules
export {
  tierForBuildings,
  tierMaxCargo,
  tierSpeedLY,
  flightHoursLY,
  repairCost,
  tickMission,
} from './fleet-rules.js';

// Surface biome regeneration (Phase 7C stub — real regen is client-side)
export { regenerateSurfaceForType } from './surface-promote.js';

// Planet resource stocks (v168 — finite extraction deposits)
export {
  generatePlanetStocks,
  depleteStock,
  getDepletionEfficiency,
  applyLevelDepletion,
  STOCK_SCALE,
} from './planet-stocks.js';
