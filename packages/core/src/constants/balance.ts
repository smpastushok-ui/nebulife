/**
 * Game balance parameters.
 * All timing/progression values are here for easy tuning.
 * Change RESEARCH_DURATION_MS to 3_600_000 (1 hour) for production.
 */

// --- Research ---
/** Duration of one research session in milliseconds. 20s for dev, 3_600_000 (1h) for prod. */
export const RESEARCH_DURATION_MS = 20_000;

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
