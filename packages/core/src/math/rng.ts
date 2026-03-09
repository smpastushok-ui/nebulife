/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * Deterministic: same seed always produces same sequence.
 * Fast, 32-bit state, excellent distribution.
 */
export class SeededRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed | 0;
  }

  /** Returns float in [0, 1) */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns integer in [min, max] inclusive */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns float in [min, max) */
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  /** Returns boolean with given probability (default 0.5) */
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /** Gaussian distribution via Box-Muller transform */
  nextGaussian(mean: number = 0, stddev: number = 1): number {
    const u1 = this.next() || 1e-10; // avoid log(0)
    const u2 = this.next();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return z * stddev + mean;
  }

  /** Clamped gaussian — stays within [min, max] */
  nextGaussianClamped(mean: number, stddev: number, min: number, max: number): number {
    const value = this.nextGaussian(mean, stddev);
    return Math.max(min, Math.min(max, value));
  }

  /** Pick random item from array */
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  /** Pick from weighted array. weights[i] = weight for items[i] */
  weightedChoice<T>(items: readonly T[], weights: readonly number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  /** Shuffle array in place (Fisher-Yates) */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /** Derive a deterministic child seed from an index */
  deriveSeed(index: number): number {
    let hash = this.state ^ (index * 2654435761);
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
    return (hash ^ (hash >>> 16)) >>> 0;
  }

  /** Create a child RNG for a sub-object */
  child(index: number): SeededRNG {
    return new SeededRNG(this.deriveSeed(index));
  }

  /** Get current state (for serialization) */
  getState(): number {
    return this.state;
  }
}

/** Create a numeric seed from a string */
export function seedFromString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash >>> 0;
}
