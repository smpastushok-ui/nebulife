import { describe, it, expect } from 'vitest';
import { orbitalPeriodYears, orbitalPeriodDays } from '../../src/physics/kepler.js';

describe('Kepler Orbital Mechanics', () => {
  it('should calculate Earth orbital period ≈ 1.0 year', () => {
    const years = orbitalPeriodYears(1.0, 1.0); // 1 AU around 1 solar mass
    expect(years).toBeCloseTo(1.0, 1);
  });

  it('should calculate Earth orbital period ≈ 365.25 days', () => {
    const days = orbitalPeriodDays(1.0, 1.0);
    expect(days).toBeCloseTo(365.25, 0);
  });

  it('should calculate Mars orbital period ≈ 1.88 years', () => {
    const years = orbitalPeriodYears(1.524, 1.0); // Mars semi-major axis
    expect(years).toBeCloseTo(1.88, 1);
  });

  it('should calculate Jupiter orbital period ≈ 11.86 years', () => {
    const years = orbitalPeriodYears(5.203, 1.0); // Jupiter semi-major axis
    expect(years).toBeCloseTo(11.86, 0);
  });

  it('closer orbits should have shorter periods', () => {
    const inner = orbitalPeriodYears(0.5, 1.0);
    const outer = orbitalPeriodYears(2.0, 1.0);
    expect(inner).toBeLessThan(outer);
  });

  it('heavier stars should result in shorter orbital periods', () => {
    const light = orbitalPeriodYears(1.0, 0.5);
    const heavy = orbitalPeriodYears(1.0, 2.0);
    expect(heavy).toBeLessThan(light);
  });
});
