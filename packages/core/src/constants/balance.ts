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

/**
 * Ring-difference research progress bounds (min%, max% per session).
 * Index = |sourcePlanetRing - targetSystemRing|.
 * Closer observatory → less ring difference → better progress per session.
 * Incentivises building colonies in rings adjacent to unexplored systems.
 * Last entry is used for all differences beyond.
 */
export const RESEARCH_PROGRESS_BY_RING: Array<{ min: number; max: number }> = [
  { min: 5, max: 80 },  // diff=0: same ring → avg ~42% → ~3 sessions  (colony bonus)
  { min: 2, max: 50 },  // diff=1: 1 ring away → avg ~26% → ~4 sessions (home→ring1)
  { min: 2, max: 15 },  // diff=2: 2 rings away → avg ~8.5% → ~12 sessions
  { min: 2, max: 5  },  // diff=3: 3 rings away → avg ~3.5% → ~29 sessions
  { min: 1, max: 1  },  // diff=4+: fixed 1% → 100 sessions
];

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

/**
 * Research data produced per colony tick per base building.
 * At COLONY_TICK_INTERVAL_MS = 60 000 ms (1 min), this yields 1 unit/hour per building.
 * Adjust to tune research economy:
 *   1/60  ≈ 0.0167  → 1 data / hour   (current)
 *   1/30  ≈ 0.0333  → 1 data / 30 min
 *   1/10  = 0.1     → 1 data / 10 min
 */
export const RESEARCH_DATA_RATE = 1 / 60;

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

// --- Colony Economy ---

/** Interval between colony ticks in milliseconds. 60s for dev, 60_000 for prod. */
export const COLONY_TICK_INTERVAL_MS = 60_000;

/** Base storage capacity provided by Colony Hub. */
export const BASE_STORAGE_CAPACITY = {
  minerals: 500,
  volatiles: 300,
  isotopes: 200,
} as const;

/** Base energy storage (without battery stations). */
export const BASE_ENERGY_STORAGE = 50;

/** Building shutdown priority (lower = shut down first). */
export const ENERGY_SHUTDOWN_PRIORITY: Record<string, number> = {
  greenhouse: 1,
  research_lab: 2,
  atmo_extractor: 3,
  mine: 4,
  water_extractor: 5,
  radar_tower: 6,
  deep_drill: 7,
  quantum_separator: 8,
  gas_fractionator: 9,
  isotope_centrifuge: 10,
  residential_dome: 11,
  orbital_telescope: 12,
  quantum_computer: 13,
  biome_dome: 14,
  atmo_shield: 15,
  landing_pad: 16,
  spaceport: 17,
  genesis_vault: 18,
  fusion_reactor: 19,
} as const;

/** Max total buildings per planet type. */
export const MAX_BUILDINGS_PER_PLANET = {
  'rocky': 40,
  'dwarf': 15,
  'gas-giant': 5,
  'ice-giant': 8,
} as const;
