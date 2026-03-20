/**
 * Game balance parameters.
 * All timing/progression values are here for easy tuning.
 * Change RESEARCH_DURATION_MS to 3_600_000 (1 hour) for production.
 */

// --- Research ---
/** Duration of one research session in milliseconds. 30s for dev, 3_600_000 (1h) for prod. */
export const RESEARCH_DURATION_MS = 30_000;

/** Minimum progress gained per research session (%). */
export const RESEARCH_MIN_PROGRESS = 2;

/** Maximum progress gained per research session (%). */
export const RESEARCH_MAX_PROGRESS = 50;

/** Number of observatories on the home planet. */
export const HOME_OBSERVATORY_COUNT = 3;

/** Maximum concurrent research slots (equals observatory count). */
export const MAX_CONCURRENT_RESEARCH = 3;

/** Ring levels accessible from home planet observatories. */
export const HOME_RESEARCH_MAX_RING = 2;

// --- Research Data ---
/** Starting research data charges for new players. */
export const INITIAL_RESEARCH_DATA = 50;

/** Cost in research data units per scan session. */
export const RESEARCH_DATA_COST = 1;

// --- Surface Harvesting ---

/** Duration of harvest animation in milliseconds. */
export const HARVEST_DURATION_MS = 1500;

/** Base yield per harvest action, before richness scaling. */
export const HARVEST_YIELD = {
  tree: { group: 'isotope'  as const, base: 1 },
  ore:  { group: 'mineral'  as const, base: 2 },
  vent: { group: 'volatile' as const, base: 1 },
} as const;

/**
 * Reference total resource values (Earth-like rocky planet).
 * Used to compute richnessFactor = planetTotal / reference.
 * Values are extractable kg from generateResources() for an Earth-mass planet.
 */
export const EARTH_REFERENCE_RESOURCES = {
  isotopes:  1.2e18,   // ~1.2 Ет extractable isotopes (U, Th, etc.)
  minerals:  3.0e22,   // ~30 Зт extractable minerals
  volatiles: 2.5e21,   // ~2.5 Зт extractable volatiles
} as const;

/** Base density of surface objects on eligible terrain (fraction 0-1). */
export const SURFACE_OBJECT_DENSITY = {
  tree: 0.25,   // 25% of land cells
  ore:  0.10,   // 10% of plains/hills/mountains
  vent: 0.05,   // 5% of coast/beach/lowland
} as const;
