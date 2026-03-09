import { describe, it, expect } from 'vitest';
import { surfaceGravity, surfaceGravityG, escapeVelocity } from '../../src/physics/gravity.js';
import { EARTH_MASS, EARTH_RADIUS } from '../../src/constants/physics.js';

describe('Gravity', () => {
  it('should calculate Earth surface gravity ≈ 9.81 m/s²', () => {
    const g = surfaceGravity(EARTH_MASS, EARTH_RADIUS);
    expect(g).toBeCloseTo(9.81, 1);
  });

  it('should calculate Earth surface gravity ≈ 1.0 g', () => {
    const g = surfaceGravityG(EARTH_MASS, EARTH_RADIUS);
    expect(g).toBeCloseTo(1.0, 1);
  });

  it('should calculate Earth escape velocity ≈ 11186 m/s', () => {
    const v = escapeVelocity(EARTH_MASS, EARTH_RADIUS);
    expect(v).toBeCloseTo(11186, -1); // within ~10 m/s
  });
});
