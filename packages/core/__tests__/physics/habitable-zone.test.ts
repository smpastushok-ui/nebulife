import { describe, it, expect } from 'vitest';
import { habitableZoneAU, isInHabitableZone } from '../../src/physics/habitable-zone.js';

describe('Habitable Zone Calculator', () => {
  it('should calculate Sun habitable zone correctly (Kopparapu et al.)', () => {
    const hz = habitableZoneAU(1.0, 5778);
    // Known values: inner conservative ~0.95 AU, outer conservative ~1.67 AU
    expect(hz.innerConservativeAU).toBeCloseTo(0.95, 1);
    expect(hz.outerConservativeAU).toBeCloseTo(1.67, 1);
    // Optimistic should be wider
    expect(hz.innerOptimisticAU).toBeLessThan(hz.innerConservativeAU);
    expect(hz.outerOptimisticAU).toBeGreaterThan(hz.outerConservativeAU);
  });

  it('should produce narrower HZ for cooler/dimmer stars', () => {
    const hzSun = habitableZoneAU(1.0, 5778);
    const hzK = habitableZoneAU(0.4, 4900); // K0 star

    const widthSun = hzSun.outerConservativeAU - hzSun.innerConservativeAU;
    const widthK = hzK.outerConservativeAU - hzK.innerConservativeAU;

    expect(widthK).toBeLessThan(widthSun);
  });

  it('should produce wider HZ for brighter stars', () => {
    const hzSun = habitableZoneAU(1.0, 5778);
    const hzF = habitableZoneAU(2.5, 6600); // F5 star

    expect(hzF.outerConservativeAU).toBeGreaterThan(hzSun.outerConservativeAU);
  });

  it('Earth at 1 AU should be in the habitable zone of the Sun', () => {
    const hz = habitableZoneAU(1.0, 5778);
    expect(isInHabitableZone(1.0, hz, true)).toBe(true);
    expect(isInHabitableZone(1.0, hz, false)).toBe(true);
  });

  it('Venus at 0.72 AU should NOT be in conservative HZ of the Sun', () => {
    const hz = habitableZoneAU(1.0, 5778);
    expect(isInHabitableZone(0.72, hz, true)).toBe(false);
  });

  it('Mars at 1.52 AU should be in conservative HZ of the Sun', () => {
    const hz = habitableZoneAU(1.0, 5778);
    expect(isInHabitableZone(1.52, hz, true)).toBe(true);
  });
});
