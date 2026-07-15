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

// Live cosmic events — recurring, time-limited observation windows
export {
  LIVE_EVENTS,
  LIVE_EVENT_ASSET_BASE,
  LIVE_EVENT_TRACKING_DURATION_MS,
  liveEventPhotoUrl,
  getLiveEventDef,
  getLiveEventSchedule,
  getAllLiveEventSchedules,
  liveEventClaimKey,
} from './live-events.js';
export type { LiveEventDef, LiveEventSchedule } from './live-events.js';

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

// Civilization diplomacy (NEXT_GEN_PLAN §B, phases 1-2 MVP)
export {
  XENO_DIPLOMACY_MIN_LEVEL,
  hasXenoDiplomacyUnlocked,
  getIntegrationPathAvailability,
  CONTACT_STAGE_ORDER,
  CONTACT_STAGE_DURATION_MS,
  CONTACT_STAGE_TRUST_REWARD,
  CONTACT_STAGE_XP_REWARD,
  createTrustState,
  createCivilizationContactState,
  isCivilizationIntegrated,
  getNextContactStage,
  canStartContactStage,
  startContactStage,
  getContactStageProgress,
  completeContactStage,
  AGGRESSIVE_ACTION_TRUST_PENALTY,
  applyAggressiveAction,
  WORKFORCE_MULTIPLIER_CAP,
  getWorkforceProductionMultiplier,
  STRIKE_TRUST_THRESHOLD,
  STRIKE_DURATION_MS,
  STRIKE_COOLDOWN_MS,
  STRIKE_PRODUCTION_MULTIPLIER,
  tickTrustState,
  getEffectiveWorkforceMultiplier,
  getTemperamentFlavorKey,
} from './civilization.js';
export type { ContactStageBlockReason, ContactStageProgress } from './civilization.js';

// Biosphere creature evolution — daily care, growth stages, generations
export {
  CREATURE_VITALITY_MAX,
  CREATURE_VITALITY_FLOOR,
  CREATURE_VITALITY_DECAY_PER_DAY,
  CREATURE_VITALITY_CARE_GAIN,
  CREATURE_VITALITY_LOW_THRESHOLD,
  CARE_DAYS_TO_ADULT,
  CARE_DAYS_TO_ELDER,
  utcDayKey,
  computeEffectiveVitality,
  canCareToday,
  computeStageFromCareDays,
  getCareBlockReason,
  applyDailyCare,
  formatCreatureAgeBucket,
  CARE_TYPES,
  OFFSPRING_COST_QUARKS,
  TRAIT_CATEGORIES,
  TRAIT_OPTIONS,
  pickMutations,
  HYBRID_PHOTO_COST_QUARKS,
  HYBRID_FULL_COST_QUARKS,
  HYBRID_UPGRADE_COST_QUARKS,
  pickHybridTraits,
} from './creature-evolution.js';
export type {
  CreatureStage,
  CreatureCareState,
  CareApplication,
  CareBlockReason,
  CareResourceType,
  CareTypeDef,
  TraitCategory,
  TraitMutation,
  CreatureAgeUnit,
  CreatureAgeBucket,
} from './creature-evolution.js';

// Biosphere creature experiments — element-driven synthesis
export {
  CREATURE_EXPERIMENT_MIN_ELEMENTS,
  CREATURE_EXPERIMENT_MAX_ELEMENTS,
  CREATURE_BIOMES,
  isCreatureBiome,
  CREATURE_ELEMENTS,
  CREATURE_ELEMENT_SYMBOLS,
  validateCreatureElementCombo,
  buildExperimentCreatureDescription,
  buildExperimentTraits,
  pickExperimentBodyPlan,
} from './creature-experiment.js';
export type { CreatureBiome, CreatureElementDef, CreatureSizeClass, CreatureSilhouette } from './creature-experiment.js';

// Biosphere creature lore — structured bilingual biography + parameters
// (never the raw generation prompt — see creature-lore.ts header).
export {
  CREATURE_LORE_SCHEMA_VERSION,
  CREATURE_LORE_BOUNDS,
  STARTER_CREATURE_LORE,
  isLocalizedText,
  isCreatureLore,
  localizedCreatureText,
  buildFallbackCreatureLore,
  parseCreatureLoreCandidate,
} from './creature-lore.js';
export type { LocalizedText, CreatureLore, CreatureLoreFallbackInput } from './creature-lore.js';

// Megastructures — "Мегаструктури кластера" collective cluster construction
export {
  MEGASTRUCTURE_RESOURCE_KEYS,
  emptyResourceBundle,
  resourceTotal,
  MEGASTRUCTURE_REQUIREMENTS,
  getMegastructureRequirements,
  MEGASTRUCTURE_DAILY_CAP,
  MEGASTRUCTURE_COMPLETION_POOL_QUARKS,
  MEGASTRUCTURE_COMPLETION_POOL_XP,
  MEGASTRUCTURE_MIN_PAYOUT_QUARKS,
  MEGASTRUCTURE_MIN_PAYOUT_DAYS,
  MEGASTRUCTURE_RESEARCH_SPEED_MULT,
  clampContribution,
  progressPercent,
  isMegastructureComplete,
  computeMegastructureBuilders,
} from './megastructure.js';
export type {
  MegastructureType,
  MegastructureStatus,
  MegastructureResourceBundle,
  MegastructureContributorStat,
  MegastructureBuilderRecord,
} from './megastructure.js';

// Precursor Signals — collectible card system dropped from planet research
export {
  PRECURSOR_CARDS,
  PRECURSOR_CARD_TOTAL,
  PRECURSOR_RARITY_WEIGHTS,
  PRECURSOR_DROP_CHANCE_DEFAULT,
  PRECURSOR_DROP_CHANCE_BY_MISSION,
  PRECURSOR_COMPLETION_REWARD_QUARKS,
  getPrecursorCardDef,
  getPrecursorDropChance,
  rollPrecursorCardDrop,
  isPrecursorCollectionComplete,
} from './precursor-cards.js';
export type { PrecursorDropResult } from './precursor-cards.js';

// Observation Seasons — "Сезони спостережень" rotating seasonal anomalies
export {
  SEASON_LENGTH_WEEKS,
  SEASON_LENGTH_MS,
  SEASON_EPOCH_UTC_MS,
  SEASON_FINALE_WINDOW_MS,
  SEASON_FINALE_WEIGHT_MULTIPLIER,
  SEASON_ANOMALY_COUNT,
  SEASON_PITY_THRESHOLD,
  SEASON_PITY_WEIGHT_MULTIPLIER,
  SEASON_COLLECTION_REWARD_QUARKS,
  SEASON_DEFINITIONS,
  isSeasonalAnomalyType,
  getSeasonalAnomalyAssetType,
  getSeasonDefById,
  seasonOccurrenceId,
  getCurrentSeason,
  getActiveSeasonalCatalogEntries,
  buildObservatoryCatalogWithSeason,
  createSeasonalProgressState,
  normalizeSeasonalProgressState,
  advanceSeasonalProgress,
  applySeasonalObservatoryResult,
  isSeasonCollectionComplete,
} from './observation-seasons.js';

// "Сага Ткача" — personal AI-written illustrated chronicle
export {
  SAGA_MILESTONE_ORDER,
  SAGA_DAILY_CHAPTER_CAP,
  queueSagaMilestone,
  toRomanNumeral,
} from './saga.js';
