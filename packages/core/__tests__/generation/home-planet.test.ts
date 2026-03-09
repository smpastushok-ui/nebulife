import { describe, it, expect } from 'vitest';
import { generateHomePlanet } from '../../src/generation/home-planet-generator.js';
import { generateStar } from '../../src/generation/star-generator.js';
import { generatePlayerRings } from '../../src/generation/galaxy-generator.js';

describe('Home Planet Generator', () => {
  it('should always produce Earth-like planet with habitability 1.0', () => {
    for (let seed = 0; seed < 100; seed++) {
      const star = generateStar(seed);
      const home = generateHomePlanet(star, seed);

      expect(home.massEarth).toBe(1.0);
      expect(home.radiusEarth).toBe(1.0);
      expect(home.surfaceGravityG).toBe(1.0);
      expect(home.surfaceTempK).toBe(288);
      expect(home.habitability.overall).toBe(1.0);
      expect(home.hasLife).toBe(true);
      expect(home.lifeComplexity).toBe('intelligent');
      expect(home.isHomePlanet).toBe(true);
      expect(home.atmosphere).not.toBeNull();
      expect(home.atmosphere!.surfacePressureAtm).toBe(1.0);
      expect(home.hydrosphere).not.toBeNull();
      expect(home.hydrosphere!.waterCoverageFraction).toBe(0.71);
    }
  });

  it('should be placed in the habitable zone', () => {
    for (let seed = 0; seed < 50; seed++) {
      const star = generateStar(seed);
      const home = generateHomePlanet(star, seed);

      expect(home.orbit.semiMajorAxisAU).toBeGreaterThanOrEqual(star.habitableZone.innerConservativeAU);
      expect(home.orbit.semiMajorAxisAU).toBeLessThanOrEqual(star.habitableZone.outerConservativeAU);
    }
  });

  it('should have one moon (Luna)', () => {
    const star = generateStar(42);
    const home = generateHomePlanet(star, 42);

    expect(home.moons.length).toBe(1);
    expect(home.moons[0].name).toBe('Luna');
  });
});

describe('Galaxy Ring Generator', () => {
  it('should generate 3 rings (0, 1, 2) with correct system counts', () => {
    const rings = generatePlayerRings(12345, 0, 0, 'player-1');

    expect(rings.length).toBe(3);
    expect(rings[0].ringIndex).toBe(0);
    expect(rings[0].starSystems.length).toBe(1);   // Home system
    expect(rings[1].ringIndex).toBe(1);
    expect(rings[1].starSystems.length).toBe(6);   // First ring
    expect(rings[2].ringIndex).toBe(2);
    expect(rings[2].starSystems.length).toBe(12);  // Second ring
  });

  it('should mark ring 0 system as home with explored status', () => {
    const rings = generatePlayerRings(12345, 0, 0, 'player-1');
    const homeSystem = rings[0].starSystems[0];

    expect(homeSystem.ownerPlayerId).toBe('player-1');
    expect(homeSystem.isExplored).toBe(true);
    expect(homeSystem.exploredByPlayerId).toBe('player-1');
  });

  it('should have a home planet in the home system', () => {
    const rings = generatePlayerRings(12345, 0, 0, 'player-1');
    const homeSystem = rings[0].starSystems[0];
    const homePlanet = homeSystem.planets.find(p => p.isHomePlanet);

    expect(homePlanet).toBeDefined();
    expect(homePlanet!.habitability.overall).toBe(1.0);
  });

  it('should produce identical systems from same galaxy seed + position', () => {
    const rings1 = generatePlayerRings(42, 10, 20, 'player-A');
    const rings2 = generatePlayerRings(42, 10, 20, 'player-B');

    // Same position → same systems (except ownership)
    expect(rings1[1].starSystems.length).toBe(rings2[1].starSystems.length);
    for (let i = 0; i < rings1[1].starSystems.length; i++) {
      expect(rings1[1].starSystems[i].star.spectralClass)
        .toBe(rings2[1].starSystems[i].star.spectralClass);
    }
  });

  it('total systems per player = 19 (1 + 6 + 12)', () => {
    const rings = generatePlayerRings(99, 50, 50, 'player-test');
    const total = rings.reduce((sum, r) => sum + r.starSystems.length, 0);
    expect(total).toBe(19);
  });
});
