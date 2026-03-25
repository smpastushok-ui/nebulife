import { SeededRNG } from '../math/rng.js';
import {
  EARTH_CRUST_COMPOSITION,
  ROCKY_PLANET_COMPOSITION,
  SOLAR_ABUNDANCE,
  ICE_RICH_COMPOSITION,
} from './elements.js';
import { EARTH_MASS } from '../constants/physics.js';
import { ELEMENT_GROUP, computeGroupTotals } from './resource-groups.js';
import type { PlanetType } from '../types/planet.js';
import type { PlanetZone } from './atmosphere.js';
import type { Atmosphere } from './atmosphere.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MineralDeposit {
  element: string;
  abundanceRelative: number;  // 0-1, relative to Earth abundance
  depth: 'surface' | 'shallow' | 'deep';
}

export interface TotalResources {
  minerals: number;   // total extractable kg
  volatiles: number;  // total extractable kg
  isotopes: number;   // total extractable kg
  elements: Record<string, number>; // per-element extractable mass in kg
}

export interface PlanetResources {
  crustComposition: Record<string, number>;
  deposits: MineralDeposit[];
  totalResources: TotalResources;
}

// ---------------------------------------------------------------------------
// Extractability factors — fraction of total planet mass that is accessible
// ---------------------------------------------------------------------------

/** Rocky: ~1% (crust + upper mantle) */
const EXTRACTABILITY_ROCKY = 0.01;
/** Gas giant: ~0.01% (upper atmosphere only) */
const EXTRACTABILITY_GAS = 0.0001;
/** Ice giant: ~0.1% (upper atmosphere + ice mantle) */
const EXTRACTABILITY_ICE = 0.001;

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Generate planetary resources: crust composition, mineral deposits,
 * and total extractable element masses.
 *
 * Physics-based generation considers planet type, orbital zone,
 * mass, temperature, and atmosphere.
 */
export function generateResources(
  rng: SeededRNG,
  planetType: PlanetType,
  zone: PlanetZone,
  massEarth: number,
  surfaceTempK: number,
  atmosphere: Atmosphere | null,
): PlanetResources {
  const planetMassKg = massEarth * EARTH_MASS;

  switch (planetType) {
    case 'rocky':
    case 'terrestrial':
    case 'dwarf':
      return generateRockyResources(rng, zone, planetMassKg, surfaceTempK);
    case 'gas-giant':
      return generateGasGiantResources(rng, planetMassKg);
    case 'ice-giant':
      return generateIceGiantResources(rng, planetMassKg);
  }
}

// ---------------------------------------------------------------------------
// Rocky / Dwarf planets
// ---------------------------------------------------------------------------

function generateRockyResources(
  rng: SeededRNG,
  zone: PlanetZone,
  planetMassKg: number,
  surfaceTempK: number,
): PlanetResources {
  // 1. Start from rocky planet bulk composition, perturb each element
  const composition: Record<string, number> = {};

  for (const [element, fraction] of Object.entries(ROCKY_PLANET_COMPOSITION)) {
    let perturbation = rng.nextFloat(0.5, 1.5);

    // Zone modifiers
    if (zone === 'inner') {
      // Inner zone: metal-enriched (formed closer to protostar)
      if (ELEMENT_GROUP[element] === 'mineral') perturbation *= 1.2;
      // Volatiles depleted by heat
      if (ELEMENT_GROUP[element] === 'volatile') perturbation *= 0.3;
    } else if (zone === 'outer' || zone === 'far') {
      // Beyond frost line: ice-enriched
      if (ELEMENT_GROUP[element] === 'volatile') perturbation *= 2.0;
      if (ELEMENT_GROUP[element] === 'mineral') perturbation *= 0.8;
    }

    // Temperature effect on volatiles: hot surfaces lose light elements
    if (ELEMENT_GROUP[element] === 'volatile' && surfaceTempK > 500) {
      const heatLoss = Math.max(0.1, 1 - (surfaceTempK - 500) / 1500);
      perturbation *= heatLoss;
    }

    composition[element] = fraction * perturbation;
  }

  // 2. Compute element masses
  const elements: Record<string, number> = {};
  for (const [element, fraction] of Object.entries(composition)) {
    elements[element] = planetMassKg * fraction * EXTRACTABILITY_ROCKY;
  }

  // 3. Generate crust composition (normalized %, for backward compat)
  const crust = generateCrustComposition(rng, zone);

  // 4. Generate mineral deposits
  const deposits = generateDeposits(rng);

  // 5. Compute group totals
  const groupTotals = computeGroupTotals(elements);

  return {
    crustComposition: crust,
    deposits,
    totalResources: {
      minerals: groupTotals.mineral,
      volatiles: groupTotals.volatile,
      isotopes: groupTotals.isotope,
      elements,
    },
  };
}

// ---------------------------------------------------------------------------
// Gas Giants
// ---------------------------------------------------------------------------

function generateGasGiantResources(
  rng: SeededRNG,
  planetMassKg: number,
): PlanetResources {
  // Gas giants: solar abundance, only upper atmosphere accessible
  const elements: Record<string, number> = {};

  for (const [element, fraction] of Object.entries(SOLAR_ABUNDANCE)) {
    const perturbation = rng.nextFloat(0.7, 1.3);
    elements[element] = planetMassKg * fraction * perturbation * EXTRACTABILITY_GAS;
  }

  const groupTotals = computeGroupTotals(elements);

  return {
    crustComposition: {},
    deposits: [],
    totalResources: {
      minerals: groupTotals.mineral,
      volatiles: groupTotals.volatile,
      isotopes: groupTotals.isotope,
      elements,
    },
  };
}

// ---------------------------------------------------------------------------
// Ice Giants
// ---------------------------------------------------------------------------

function generateIceGiantResources(
  rng: SeededRNG,
  planetMassKg: number,
): PlanetResources {
  // Ice giants: mix of H/He envelope + ice mantle + rocky core
  // ~20% H/He, ~60% ices (H2O, CH4, NH3), ~20% rock
  const elements: Record<string, number> = {};

  // H/He envelope (~20% of mass, solar-like for these elements)
  const envelopeMass = planetMassKg * 0.20;
  elements['H'] = envelopeMass * 0.75 * rng.nextFloat(0.8, 1.2) * EXTRACTABILITY_ICE;
  elements['He'] = envelopeMass * 0.25 * rng.nextFloat(0.8, 1.2) * EXTRACTABILITY_ICE;

  // Ice mantle (~60% of mass)
  const iceMass = planetMassKg * 0.60;
  // H2O dominates ices
  elements['O'] = (elements['O'] ?? 0) + iceMass * 0.55 * rng.nextFloat(0.7, 1.3) * EXTRACTABILITY_ICE;
  elements['H'] += iceMass * 0.07 * rng.nextFloat(0.7, 1.3) * EXTRACTABILITY_ICE;
  // CH4
  elements['C'] = iceMass * 0.12 * rng.nextFloat(0.7, 1.3) * EXTRACTABILITY_ICE;
  // NH3
  elements['N'] = iceMass * 0.08 * rng.nextFloat(0.7, 1.3) * EXTRACTABILITY_ICE;
  // Other ices
  elements['S'] = iceMass * 0.03 * rng.nextFloat(0.5, 1.5) * EXTRACTABILITY_ICE;

  // Rocky core (~20% of mass) — use ice-rich composition for the core
  const coreMass = planetMassKg * 0.20;
  for (const [element, fraction] of Object.entries(ICE_RICH_COMPOSITION)) {
    const perturbation = rng.nextFloat(0.6, 1.4);
    // Core is mostly inaccessible, 10% of normal extractability
    const coreMassEl = coreMass * fraction * perturbation * EXTRACTABILITY_ICE * 0.1;
    elements[element] = (elements[element] ?? 0) + coreMassEl;
  }

  const groupTotals = computeGroupTotals(elements);

  return {
    crustComposition: {},
    deposits: [],
    totalResources: {
      minerals: groupTotals.mineral,
      volatiles: groupTotals.volatile,
      isotopes: groupTotals.isotope,
      elements,
    },
  };
}

// ---------------------------------------------------------------------------
// Legacy helpers (crust composition & deposits — backward compat)
// ---------------------------------------------------------------------------

function generateCrustComposition(
  rng: SeededRNG,
  zone: PlanetZone,
): Record<string, number> {
  const crust: Record<string, number> = {};
  let total = 0;

  for (const [element, fraction] of Object.entries(EARTH_CRUST_COMPOSITION)) {
    const perturbation = rng.nextFloat(0.5, 1.5);
    crust[element] = fraction * perturbation;
    total += crust[element];
  }

  for (const element of Object.keys(crust)) {
    crust[element] = Math.round((crust[element] / total) * 10000) / 10000;
  }

  return crust;
}

function generateDeposits(rng: SeededRNG): MineralDeposit[] {
  const deposits: MineralDeposit[] = [];
  const valuableElements = ['Fe', 'Cu', 'Ni', 'Ti', 'U', 'Al', 'Si'];
  const depths: MineralDeposit['depth'][] = ['surface', 'shallow', 'deep'];

  for (const element of valuableElements) {
    if (rng.nextBool(0.6)) {
      deposits.push({
        element,
        abundanceRelative: rng.nextFloat(0.1, 2.0),
        depth: rng.pick(depths),
      });
    }
  }

  if (rng.nextBool(0.15)) {
    deposits.push({
      element: 'U',
      abundanceRelative: rng.nextFloat(0.01, 0.5),
      depth: 'deep',
    });
  }

  return deposits;
}
