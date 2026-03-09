import { describe, it, expect } from 'vitest';
import { SeededRNG, seedFromString } from '../../src/math/rng.js';

describe('SeededRNG', () => {
  it('should be deterministic — same seed produces same sequence', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);

    for (let i = 0; i < 100; i++) {
      expect(rng1.next()).toBe(rng2.next());
    }
  });

  it('should produce different sequences for different seeds', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(43);

    const seq1 = Array.from({ length: 10 }, () => rng1.next());
    const seq2 = Array.from({ length: 10 }, () => rng2.next());

    expect(seq1).not.toEqual(seq2);
  });

  it('should produce values in [0, 1)', () => {
    const rng = new SeededRNG(12345);
    for (let i = 0; i < 10000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('should produce uniform distribution', () => {
    const rng = new SeededRNG(99);
    const buckets = new Array(10).fill(0);
    const n = 100000;

    for (let i = 0; i < n; i++) {
      const bucket = Math.floor(rng.next() * 10);
      buckets[bucket]++;
    }

    // Each bucket should have ~10% (tolerance 1.5%)
    for (const count of buckets) {
      expect(count / n).toBeCloseTo(0.1, 1);
    }
  });

  it('nextInt should produce integers in [min, max]', () => {
    const rng = new SeededRNG(777);
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextInt(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('nextFloat should produce floats in [min, max)', () => {
    const rng = new SeededRNG(555);
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextFloat(2.5, 5.5);
      expect(v).toBeGreaterThanOrEqual(2.5);
      expect(v).toBeLessThan(5.5);
    }
  });

  it('nextGaussian should produce roughly normal distribution', () => {
    const rng = new SeededRNG(1234);
    const n = 50000;
    let sum = 0;
    let sumSq = 0;

    for (let i = 0; i < n; i++) {
      const v = rng.nextGaussian(10, 2);
      sum += v;
      sumSq += v * v;
    }

    const mean = sum / n;
    const variance = sumSq / n - mean * mean;

    expect(mean).toBeCloseTo(10, 0);
    expect(Math.sqrt(variance)).toBeCloseTo(2, 0);
  });

  it('weightedChoice should respect weights', () => {
    const rng = new SeededRNG(42);
    const items = ['A', 'B', 'C'];
    const weights = [1, 2, 7]; // A=10%, B=20%, C=70%
    const counts: Record<string, number> = { A: 0, B: 0, C: 0 };
    const n = 10000;

    for (let i = 0; i < n; i++) {
      counts[rng.weightedChoice(items, weights)]++;
    }

    expect(counts['A'] / n).toBeCloseTo(0.1, 1);
    expect(counts['B'] / n).toBeCloseTo(0.2, 1);
    expect(counts['C'] / n).toBeCloseTo(0.7, 1);
  });

  it('deriveSeed should be deterministic', () => {
    const rng1 = new SeededRNG(42);
    const rng2 = new SeededRNG(42);

    expect(rng1.deriveSeed(0)).toBe(rng2.deriveSeed(0));
    expect(rng1.deriveSeed(1)).toBe(rng2.deriveSeed(1));
    expect(rng1.deriveSeed(100)).toBe(rng2.deriveSeed(100));
  });

  it('deriveSeed should produce different seeds for different indices', () => {
    const rng = new SeededRNG(42);
    const seeds = new Set<number>();

    for (let i = 0; i < 1000; i++) {
      seeds.add(rng.deriveSeed(i));
    }

    expect(seeds.size).toBe(1000); // All unique
  });

  it('child RNG should be independent and deterministic', () => {
    const parent1 = new SeededRNG(42);
    const parent2 = new SeededRNG(42);

    const child1 = parent1.child(5);
    const child2 = parent2.child(5);

    for (let i = 0; i < 50; i++) {
      expect(child1.next()).toBe(child2.next());
    }
  });
});

describe('seedFromString', () => {
  it('should produce consistent seeds', () => {
    expect(seedFromString('hello')).toBe(seedFromString('hello'));
  });

  it('should produce different seeds for different strings', () => {
    expect(seedFromString('hello')).not.toBe(seedFromString('world'));
  });
});
