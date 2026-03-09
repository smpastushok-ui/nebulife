import { SeededRNG } from '../math/rng.js';
import { LIFE_PROBABILITY, LIFE_HABITABILITY_THRESHOLD } from '../constants/game.js';

export type LifeComplexity = 'none' | 'microbial' | 'multicellular' | 'intelligent';

export interface LifeResult {
  hasLife: boolean;
  complexity: LifeComplexity;
}

/**
 * Determine if life exists on a planet.
 *
 * Rules:
 * - habitabilityScore >= 0.7 → 15% chance of life
 * - If life exists, complexity depends on habitability + planet age
 * - Higher habitability → higher chance of complex life
 */
export function rollForLife(
  rng: SeededRNG,
  habitabilityScore: number,
  planetAgeGyr: number,
): LifeResult {
  if (habitabilityScore < LIFE_HABITABILITY_THRESHOLD) {
    return { hasLife: false, complexity: 'none' };
  }

  // Roll for life existence at 15% probability
  const hasLife = rng.next() < LIFE_PROBABILITY;

  if (!hasLife) {
    return { hasLife: false, complexity: 'none' };
  }

  // Determine complexity based on habitability and age
  const complexity = determineComplexity(rng, habitabilityScore, planetAgeGyr);

  return { hasLife: true, complexity };
}

/**
 * Determine life complexity.
 *
 * Timeline (Earth-like reference):
 * - Microbial: appears after ~0.5 Gyr
 * - Multicellular: after ~2 Gyr
 * - Intelligent: after ~4 Gyr
 *
 * Higher habitability accelerates evolution.
 */
function determineComplexity(
  rng: SeededRNG,
  habitabilityScore: number,
  ageGyr: number,
): LifeComplexity {
  // Habitability accelerates evolution
  const effectiveAge = ageGyr * habitabilityScore;

  if (effectiveAge < 0.5) {
    return 'microbial';
  }

  if (effectiveAge < 2.0) {
    // Small chance of multicellular
    return rng.nextBool(0.1) ? 'multicellular' : 'microbial';
  }

  if (effectiveAge < 4.0) {
    // Good chance of multicellular, small chance of intelligent
    const roll = rng.next();
    if (roll < 0.05) return 'intelligent';
    if (roll < 0.6) return 'multicellular';
    return 'microbial';
  }

  // Old, habitable planet: likely complex life
  const roll = rng.next();
  if (roll < 0.15) return 'intelligent';
  if (roll < 0.7) return 'multicellular';
  return 'microbial';
}
