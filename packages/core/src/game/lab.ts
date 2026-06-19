import { SeededRNG } from '../math/rng.js';
import type { LifeSparkType } from './lifeform.js';

/**
 * Research-lab experiments. Two manual jobs:
 *  1. Particle extraction — distil a small batch of *rare* "unique particles"
 *     (precious / radioactive / exotic elements) out of bulk resources. These
 *     are the elements that feed life synthesis. Timed job, deterministic roll.
 *  2. Spark of life — a DNA-constructor minigame whose difficulty scales with
 *     the rarity of the targeted spark (see {@link SPARK_DIFFICULTY}). The
 *     minigame logic lives client-side; this module only defines the tiers.
 */

/** Bulk units consumed per extraction batch. */
export const EXTRACTION_BATCH = 60;

/** Extraction runtime — 45 minutes. */
export const EXTRACTION_DURATION_MS = 2_700_000;

/** Research-data spent to start an extraction. */
export const EXTRACTION_RESEARCH_DATA_COST = 15;

/**
 * Weighted pool of "unique particles" extraction can yield — biased toward the
 * rare elements that matter for genesis (precious metals, radioactives, exotic
 * non-metals / noble gases). Common rock-formers are intentionally absent.
 */
const EXTRACTION_POOL: Array<[string, number]> = [
  ['C', 18], ['P', 14], ['S', 12], ['Se', 8], ['Li', 7], ['Be', 5],
  ['F', 5], ['Cu', 5], ['Ag', 4], ['Au', 3], ['Pt', 2.5], ['W', 2.5],
  ['Xe', 2], ['Kr', 2], ['U', 1.5], ['Th', 1], ['Ra', 0.6], ['Pu', 0.4],
];

export interface ExtractionJob {
  id: string;
  /** PlacedBuilding id of the research_lab running this job. */
  buildingId: string;
  /** Scoped planet key the bulk resource came from. */
  planetId: string;
  /** Bulk units consumed at start (always EXTRACTION_BATCH). */
  amount: number;
  startedAt: number;
  durationMs: number;
  seed: number;
}

/** Distinct particle types produced per extraction batch. */
export const EXTRACTION_YIELD_COUNT = 12;

/**
 * Roll a weighted "unique particle" distribution for one extraction batch.
 * @returns map of element symbol → integer units.
 */
export function rollParticleExtraction(seed: number, count: number = EXTRACTION_YIELD_COUNT): Record<string, number> {
  const totalWeight = EXTRACTION_POOL.reduce((sum, [, w]) => sum + w, 0);
  const rng = new SeededRNG(seed >>> 0);
  const out: Record<string, number> = {};
  for (let i = 0; i < count; i++) {
    let r = rng.next() * totalWeight;
    for (const [sym, w] of EXTRACTION_POOL) {
      r -= w;
      if (r <= 0) {
        out[sym] = (out[sym] ?? 0) + 1;
        break;
      }
    }
  }
  return out;
}

/** Elements (descending weight) a player can see as possible extraction output. */
export function getExtractionElements(): string[] {
  return [...EXTRACTION_POOL].sort((a, b) => b[1] - a[1]).map(([sym]) => sym);
}

export interface SparkDifficulty {
  /** Number of base pairs the DNA strand must be assembled from. */
  length: number;
  /** Number of distinct base options offered (2 = A/T, 4 = + G/C, etc.). */
  bases: number;
  /** Seconds of inspection before the template is hidden (0 = always shown). */
  memorizeSeconds: number;
}

/**
 * DNA-constructor difficulty per spark type. Rarer sparks ⇒ longer strands,
 * more base options, shorter memorisation window.
 */
export const SPARK_DIFFICULTY: Record<LifeSparkType, SparkDifficulty> = {
  primordial: { length: 4, bases: 2, memorizeSeconds: 0 },
  adaptive:   { length: 6, bases: 3, memorizeSeconds: 0 },
  neural:     { length: 8, bases: 4, memorizeSeconds: 6 },
  stellar:    { length: 10, bases: 4, memorizeSeconds: 4 },
};
