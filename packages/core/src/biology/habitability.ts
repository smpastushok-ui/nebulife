import type { Atmosphere } from '../chemistry/atmosphere.js';
import type { Hydrosphere } from '../chemistry/water.js';

export interface MagneticField {
  strengthT: number;        // Tesla at surface (Earth ~5e-5 T)
  hasMagnetosphere: boolean;
}

export interface HabitabilityFactors {
  temperature: number;      // 0-1, peaks at 288K
  atmosphere: number;       // 0-1, needs breathable + pressure
  water: number;            // 0-1, needs liquid water
  magneticField: number;    // 0-1, protects from radiation
  gravity: number;          // 0-1, peaks at 1g
  overall: number;          // Weighted average, 0-1
}

/**
 * Calculate habitability score (0-1) for a planet.
 * Weighted factors based on importance for complex life.
 */
export function calculateHabitability(
  surfaceTempK: number,
  atmosphere: Atmosphere | null,
  hydrosphere: Hydrosphere | null,
  magneticField: MagneticField,
  surfaceGravityG: number,
): HabitabilityFactors {
  // Temperature factor: Gaussian peak at 288K (15°C), σ=30K
  const tempDelta = Math.abs(surfaceTempK - 288);
  const temperature = Math.exp(-0.5 * (tempDelta / 30) ** 2);

  // Atmosphere factor
  let atmosphereFactor = 0;
  if (atmosphere) {
    const p = atmosphere.surfacePressureAtm;
    // Pressure should be 0.5-2.0 atm for comfort, tolerable 0.1-5.0
    const pressureScore = p >= 0.5 && p <= 2.0
      ? 1.0
      : p >= 0.1 && p <= 5.0
        ? 0.6
        : p > 0 && p <= 10
          ? 0.2
          : 0;

    // Check for breathable gases (O2 presence)
    const o2 = atmosphere.composition['O2'] ?? 0;
    const co2 = atmosphere.composition['CO2'] ?? 0;
    const breathableScore = o2 > 0.15 && o2 < 0.30 ? 1.0
      : o2 > 0.10 ? 0.7
        : o2 > 0.05 ? 0.3
          : 0;

    // CO2 toxicity penalty (>5% is dangerous for humans)
    const co2Penalty = co2 > 0.05 ? 0.5 : co2 > 0.01 ? 0.8 : 1.0;

    atmosphereFactor = pressureScore * Math.max(breathableScore, 0.1) * co2Penalty;
  }

  // Water factor
  let waterFactor = 0;
  if (hydrosphere) {
    const coverage = hydrosphere.waterCoverageFraction;
    // Optimal: 30-80% water coverage
    if (coverage >= 0.3 && coverage <= 0.8) {
      waterFactor = 1.0;
    } else if (coverage > 0) {
      waterFactor = coverage < 0.3 ? coverage / 0.3 : 1 - (coverage - 0.8) / 0.2;
      waterFactor = Math.max(0, Math.min(1, waterFactor));
    }
    // Ice-only worlds get partial credit
    if (coverage === 0 && hydrosphere.iceCapFraction > 0.5) {
      waterFactor = 0.2;
    }
    if (hydrosphere.hasSubsurfaceOcean) {
      waterFactor = Math.max(waterFactor, 0.3);
    }
  }

  // Magnetic field factor
  const magneticFieldFactor = magneticField.hasMagnetosphere ? 1.0
    : magneticField.strengthT > 1e-6 ? 0.5
      : 0.1;

  // Gravity factor: Gaussian peak at 1g, σ=0.4g
  const gravDelta = Math.abs(surfaceGravityG - 1.0);
  const gravityFactor = Math.exp(-0.5 * (gravDelta / 0.4) ** 2);

  // Weighted overall score
  const weights = {
    temperature: 0.30,
    atmosphere: 0.25,
    water: 0.25,
    magneticField: 0.10,
    gravity: 0.10,
  };

  const overall =
    temperature * weights.temperature +
    atmosphereFactor * weights.atmosphere +
    waterFactor * weights.water +
    magneticFieldFactor * weights.magneticField +
    gravityFactor * weights.gravity;

  return {
    temperature: round4(temperature),
    atmosphere: round4(atmosphereFactor),
    water: round4(waterFactor),
    magneticField: round4(magneticFieldFactor),
    gravity: round4(gravityFactor),
    overall: round4(overall),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
