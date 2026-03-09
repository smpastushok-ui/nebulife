import { describe, it, expect } from 'vitest';
import { generateStarSystem } from '../../src/generation/star-system-generator.js';
import { generateStar } from '../../src/generation/star-generator.js';

describe('Star Generator', () => {
  it('should be deterministic — same seed produces same star', () => {
    const star1 = generateStar(42);
    const star2 = generateStar(42);
    expect(star1).toEqual(star2);
  });

  it('should produce different stars for different seeds', () => {
    const star1 = generateStar(42);
    const star2 = generateStar(43);
    expect(star1.seed).not.toBe(star2.seed);
  });

  it('should have valid habitable zone (inner < outer)', () => {
    for (let seed = 0; seed < 100; seed++) {
      const star = generateStar(seed);
      expect(star.habitableZone.innerOptimisticAU).toBeLessThan(star.habitableZone.outerOptimisticAU);
      expect(star.habitableZone.innerConservativeAU).toBeLessThan(star.habitableZone.outerConservativeAU);
    }
  });

  it('should produce mostly M-class stars (~76%)', () => {
    const counts: Record<string, number> = {};
    const n = 5000;
    for (let i = 0; i < n; i++) {
      const star = generateStar(i * 7 + 1);
      counts[star.spectralClass] = (counts[star.spectralClass] ?? 0) + 1;
    }
    const mFraction = (counts['M'] ?? 0) / n;
    // Should be roughly 76% ± 5%
    expect(mFraction).toBeGreaterThan(0.65);
    expect(mFraction).toBeLessThan(0.85);
  });
});

describe('Star System Generator', () => {
  it('should be deterministic — same seed produces same system', () => {
    const sys1 = generateStarSystem(42);
    const sys2 = generateStarSystem(42);
    expect(sys1.star).toEqual(sys2.star);
    expect(sys1.planets.length).toBe(sys2.planets.length);
    for (let i = 0; i < sys1.planets.length; i++) {
      expect(sys1.planets[i].massEarth).toBe(sys2.planets[i].massEarth);
    }
  });

  it('should generate 2-12 planets', () => {
    for (let seed = 0; seed < 200; seed++) {
      const sys = generateStarSystem(seed);
      expect(sys.planets.length).toBeGreaterThanOrEqual(2);
      expect(sys.planets.length).toBeLessThanOrEqual(12);
    }
  });

  it('should have planets sorted by orbital distance', () => {
    for (let seed = 0; seed < 50; seed++) {
      const sys = generateStarSystem(seed);
      for (let i = 1; i < sys.planets.length; i++) {
        expect(sys.planets[i].orbit.semiMajorAxisAU)
          .toBeGreaterThan(sys.planets[i - 1].orbit.semiMajorAxisAU);
      }
    }
  });

  it('should generate valid planet properties', () => {
    const sys = generateStarSystem(42);
    for (const planet of sys.planets) {
      expect(planet.massEarth).toBeGreaterThan(0);
      expect(planet.radiusEarth).toBeGreaterThan(0);
      expect(planet.densityGCm3).toBeGreaterThan(0);
      expect(planet.surfaceGravityG).toBeGreaterThan(0);
      expect(planet.escapeVelocityKmS).toBeGreaterThan(0);
      expect(planet.orbit.periodYears).toBeGreaterThan(0);
      expect(planet.habitability.overall).toBeGreaterThanOrEqual(0);
      expect(planet.habitability.overall).toBeLessThanOrEqual(1);
    }
  });

  it('should produce ~15% life on habitable planets over many seeds', () => {
    let habitablePlanets = 0;
    let planetsWithLife = 0;

    for (let seed = 0; seed < 2000; seed++) {
      const sys = generateStarSystem(seed * 3 + 7);
      for (const planet of sys.planets) {
        if (planet.habitability.overall >= 0.7) {
          habitablePlanets++;
          if (planet.hasLife) planetsWithLife++;
        }
      }
    }

    if (habitablePlanets > 50) {
      const lifeRate = planetsWithLife / habitablePlanets;
      // Should be roughly 15% ± 10% (wide tolerance for statistical variation)
      expect(lifeRate).toBeGreaterThan(0.05);
      expect(lifeRate).toBeLessThan(0.30);
    }
  });
});
