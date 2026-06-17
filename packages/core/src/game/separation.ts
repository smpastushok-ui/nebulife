// ---------------------------------------------------------------------------
// Quantum Separator — active batch separation of bulk group resources into
// discrete chemical elements.
//
// Design (per game design): before separation a colony only holds bulk GROUP
// resources (minerals / volatiles / isotopes). The separator takes a fixed
// batch (SEPARATION_BATCH units) of one group, runs for SEPARATION_DURATION_MS,
// and on completion yields a RANDOM but WEIGHTED distribution of elements from
// that group — abundant/simple elements come out frequently and in larger
// amounts, rare elements rarely and in small amounts.
//
// Determinism: the element roll is driven entirely by SeededRNG(seed). The same
// (seed, group, amount) always yields the same distribution, so the result can
// be recomputed safely after reloads / offline completion.
// ---------------------------------------------------------------------------

import { SeededRNG } from '../math/rng.js';

/** Bulk group resource that the separator can decompose. */
export type SeparationGroup = 'mineral' | 'volatile' | 'isotope' | 'water';

export interface SeparationJob {
  id: string;
  /** PlacedBuilding id of the quantum_separator running this job. */
  buildingId: string;
  /** Scoped planet key the elements are credited to (bulk resource source). */
  planetId: string;
  group: SeparationGroup;
  /** Bulk units consumed at start (always SEPARATION_BATCH). */
  amount: number;
  startedAt: number;
  durationMs: number;
  seed: number;
}

/** Bulk units consumed per separation batch. */
export const SEPARATION_BATCH = 100;

/** Batch runtime — 1 hour. */
export const SEPARATION_DURATION_MS = 3_600_000;

/** Research-data spent to start a batch. */
export const SEPARATION_RESEARCH_DATA_COST = 20;

/**
 * Weighted element pools per group. Weight ≈ relative abundance: common,
 * structurally-simple elements have high weight (frequent + large yield), rare
 * precious/heavy elements have low weight (infrequent + tiny yield).
 */
const SEPARATION_POOLS: Record<SeparationGroup, Array<[string, number]>> = {
  mineral: [
    ['Fe', 22], ['Si', 20], ['O', 16], ['Al', 14], ['Mg', 10], ['Ca', 8],
    ['Na', 6], ['K', 5], ['Ti', 4], ['Ni', 3], ['Cu', 3], ['Mn', 2.5],
    ['Cr', 2], ['Zn', 1.5], ['Co', 1], ['V', 0.8], ['Li', 0.6], ['W', 0.5],
    ['Be', 0.4], ['Ag', 0.3], ['Au', 0.2], ['Pt', 0.15],
  ],
  volatile: [
    ['H', 24], ['He', 18], ['C', 14], ['N', 12], ['S', 8], ['Cl', 5],
    ['Ar', 4], ['P', 3], ['F', 2.5], ['Ne', 2], ['Se', 1], ['Kr', 0.6],
    ['Xe', 0.4],
  ],
  isotope: [
    ['U', 16], ['Th', 10], ['Ra', 3], ['Pu', 1],
  ],
  // Water (H₂O) splits into hydrogen and oxygen at the 2:1 atomic ratio.
  water: [
    ['H', 2], ['O', 1],
  ],
};

/** Elements (descending weight) that a batch of the given group can yield. */
export function getSeparationElements(group: SeparationGroup): string[] {
  return SEPARATION_POOLS[group].map(([sym]) => sym);
}

/**
 * Roll a weighted element distribution for one batch.
 *
 * @returns map of element symbol → integer units, summing to `amount`.
 */
export function rollSeparation(
  group: SeparationGroup,
  amount: number,
  seed: number,
): Record<string, number> {
  const pool = SEPARATION_POOLS[group];
  const totalWeight = pool.reduce((sum, [, w]) => sum + w, 0);
  const rng = new SeededRNG(seed);
  const out: Record<string, number> = {};
  for (let i = 0; i < amount; i++) {
    let r = rng.next() * totalWeight;
    for (const [sym, w] of pool) {
      r -= w;
      if (r <= 0) {
        out[sym] = (out[sym] ?? 0) + 1;
        break;
      }
    }
  }
  return out;
}
