export { calculateImpactTime, remainingTimeMs, remainingTimeFormatted, isPlanetDestroyed } from './timeline.js';
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
  getResearchProgress,
  isSystemFullyResearched,
  getSystemResearch,
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
