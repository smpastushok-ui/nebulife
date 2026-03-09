import { SeededRNG } from '../math/rng.js';
import { EARTH_CRUST_COMPOSITION } from './elements.js';

export interface MineralDeposit {
  element: string;
  abundanceRelative: number;  // 0-1, relative to Earth abundance
  depth: 'surface' | 'shallow' | 'deep';
}

export interface PlanetResources {
  crustComposition: Record<string, number>;
  deposits: MineralDeposit[];
}

/**
 * Generate planetary crust composition and mineral deposits.
 * Perturbs Earth-like composition with random variations.
 */
export function generateResources(rng: SeededRNG, isRocky: boolean): PlanetResources {
  if (!isRocky) {
    // Gas/ice giants have no solid crust
    return { crustComposition: {}, deposits: [] };
  }

  // Perturb Earth crust composition
  const crust: Record<string, number> = {};
  let total = 0;

  for (const [element, fraction] of Object.entries(EARTH_CRUST_COMPOSITION)) {
    // Random variation: ±50% of Earth value
    const perturbation = rng.nextFloat(0.5, 1.5);
    crust[element] = fraction * perturbation;
    total += crust[element];
  }

  // Normalize to sum to 1
  for (const element of Object.keys(crust)) {
    crust[element] = Math.round((crust[element] / total) * 10000) / 10000;
  }

  // Generate mineral deposits
  const deposits: MineralDeposit[] = [];
  const valuableElements = ['Fe', 'Cu', 'Ni', 'Ti', 'U', 'Al', 'Si'];
  const depths: MineralDeposit['depth'][] = ['surface', 'shallow', 'deep'];

  for (const element of valuableElements) {
    if (rng.nextBool(0.6)) { // 60% chance each deposit exists
      deposits.push({
        element,
        abundanceRelative: rng.nextFloat(0.1, 2.0),
        depth: rng.pick(depths),
      });
    }
  }

  // Rare chance of uranium deposits
  if (rng.nextBool(0.15)) {
    deposits.push({
      element: 'U',
      abundanceRelative: rng.nextFloat(0.01, 0.5),
      depth: 'deep',
    });
  }

  return { crustComposition: crust, deposits };
}
