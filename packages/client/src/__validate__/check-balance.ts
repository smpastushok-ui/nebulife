/**
 * v169 Balance Validation — Planet Resource Stocks (integration test)
 *
 * This file is NOT compiled into production builds (it lives in __validate__/).
 * Run manually after a build to verify stock calibration:
 *
 *   npx tsx packages/client/src/__validate__/check-balance.ts
 *
 * IMPORTANT: This is an integration test — it calls the REAL generatePlanetStocks()
 * and ELEMENT_GROUP from @nebulife/core so that any change to production code
 * (STOCK_SCALE, element group classification, water logic) is immediately caught here.
 * Do NOT re-implement formulas inline.
 *
 * Expected ranges (v169 calibration after O→mineral fix):
 *   Earth-like (rocky, habitable):  minerals ~50k, volatiles ~30k, isotopes ~5k, water ~40k
 *   Mars-like  (rocky, inner/hab, 0.107 M_E, hot):  minerals ~5k, volatiles ~500-1500, isotopes ~500
 *   Europa-like (dwarf, outer, 0.008 M_E, icy+subsurface): water >5k (ice+subsurface)
 *   Jupiter-like (gas-giant): water = 0, volatiles huge
 */

import { generatePlanetStocks, ELEMENT_GROUP } from '@nebulife/core';
import type { Planet } from '@nebulife/core';

// ---------------------------------------------------------------------------
// Mock Planet builder
// ---------------------------------------------------------------------------
// Constructs minimal Planet objects that satisfy generatePlanetStocks().
// The function only reads: planet.type, planet.resources.totalResources,
// planet.hydrosphere, planet.radiusEarth.
// All other required Planet fields are stubbed with safe zero-values.

function makePlanet(overrides: {
  id?: string;
  type: Planet['type'];
  radiusEarth: number;
  resources: {
    totalResources: {
      minerals: number;
      volatiles: number;
      isotopes: number;
      elements: Record<string, number>;
    };
  };
  hydrosphere?: Planet['hydrosphere'];
}): Planet {
  return {
    id: overrides.id ?? 'test-planet',
    seed: 12345,
    name: 'Test Planet',
    type: overrides.type,
    zone: 'habitable',
    massEarth: 1,
    radiusEarth: overrides.radiusEarth,
    densityGCm3: 5.5,
    surfaceGravityG: 1,
    escapeVelocityKmS: 11.2,
    orbit: {
      semiMajorAxisAU: 1,
      eccentricity: 0,
      inclinationDeg: 0,
      argumentOfPeriapsisDeg: 0,
      longitudeOfAscendingNodeDeg: 0,
      meanAnomalyDeg: 0,
      periodYears: 1,
      periodDays: 365,
    },
    equilibriumTempK: 255,
    surfaceTempK: 288,
    albedo: 0.3,
    atmosphere: null,
    hydrosphere: overrides.hydrosphere ?? null,
    magneticField: { strengthT: 5e-5, hasMagnetosphere: false },
    resources: {
      crustComposition: {},
      deposits: [],
      ...overrides.resources,
    },
    habitability: {
      temperature: 0.8,
      atmosphere: 0.8,
      water: 0.7,
      magneticField: 0.8,
      gravity: 0.9,
      overall: 0.8,
    },
    hasLife: false,
    lifeComplexity: 'none',
    moons: [],
    isHomePlanet: false,
    isColonizable: true,
    terraformDifficulty: 0.2,
  } as Planet;
}

// ---------------------------------------------------------------------------
// Planet mock objects (physics-grounded values matching v169 calibration)
// ---------------------------------------------------------------------------

// ── Earth-like (1 M_E, habitable zone, rocky, liquid oceans) ──────────────
// totalResources come from ROCKY_PLANET_COMPOSITION × 1 M_Earth × 0.01 extractability
// Values used here match the STOCK_SCALE anchor point in planet-stocks.ts.
const EARTH_MINERALS_KG  = 5.80e22;   // raw mineral kg (O included as mineral, v169)
const EARTH_VOLATILES_KG = 1.88e21;   // raw volatile kg (O excluded, v169)
const EARTH_ISOTOPES_KG  = 3.17e15;   // raw isotope kg (U/Th/Pu/Ra ppb-range)

const earthPlanet = makePlanet({
  id: 'earth-like',
  type: 'terrestrial',
  radiusEarth: 1.0,
  resources: {
    totalResources: {
      minerals: EARTH_MINERALS_KG,
      volatiles: EARTH_VOLATILES_KG,
      isotopes: EARTH_ISOTOPES_KG,
      elements: {},
    },
  },
  hydrosphere: {
    waterCoverageFraction: 0.71,
    oceanDepthKm: 3.7,
    iceCapFraction: 0.02,
    hasSubsurfaceOcean: false,
  },
});

// ── Mars-like (0.107 M_E, inner/habitable zone, small ice caps, no liquid) ─
const MARS_SCALE = 0.107; // M_Earth
const marsPlanet = makePlanet({
  id: 'mars-like',
  type: 'rocky',
  radiusEarth: 0.53,
  resources: {
    totalResources: {
      // Inner zone mineral x1.2, volatile x0.3 multipliers applied at generation
      minerals: EARTH_MINERALS_KG * MARS_SCALE * 1.2,
      volatiles: EARTH_VOLATILES_KG * MARS_SCALE * 0.3,
      isotopes: EARTH_ISOTOPES_KG * MARS_SCALE,
      elements: {},
    },
  },
  hydrosphere: {
    waterCoverageFraction: 0,
    oceanDepthKm: 0,
    iceCapFraction: 0.05,
    hasSubsurfaceOcean: false,
  },
});

// ── Europa-like (0.008 M_E, dwarf, icy, subsurface ocean) ─────────────────
const EUROPA_SCALE = 0.008;
const europaPlanet = makePlanet({
  id: 'europa-like',
  type: 'dwarf',
  radiusEarth: 0.245,
  resources: {
    totalResources: {
      // Outer zone mineral x0.8, volatile x2.0
      minerals: EARTH_MINERALS_KG * EUROPA_SCALE * 0.8,
      volatiles: EARTH_VOLATILES_KG * EUROPA_SCALE * 2.0,
      isotopes: EARTH_ISOTOPES_KG * EUROPA_SCALE,
      elements: {},
    },
  },
  hydrosphere: {
    waterCoverageFraction: 0,
    oceanDepthKm: 0,
    iceCapFraction: 0.9,   // almost entirely ice-covered
    hasSubsurfaceOcean: true,
  },
});

// ── Jupiter-like (gas-giant) — water MUST be 0 ────────────────────────────
const jupiterPlanet = makePlanet({
  id: 'jupiter-like',
  type: 'gas-giant',
  radiusEarth: 11.2,
  resources: {
    totalResources: {
      minerals: 0,
      volatiles: 5.0e26,  // Jupiter-class: mostly H/He
      isotopes: 0,
      elements: {},
    },
  },
  hydrosphere: null,
});

// ── Neptune-like (ice-giant) — water = small fraction of volatiles ─────────
const neptunePlanet = makePlanet({
  id: 'neptune-like',
  type: 'ice-giant',
  radiusEarth: 3.9,
  resources: {
    totalResources: {
      minerals: 0,
      volatiles: 2.0e24,  // ice-giant: ices + gas
      isotopes: 0,
      elements: {},
    },
  },
  hydrosphere: null,
});

// ---------------------------------------------------------------------------
// Run integration tests
// ---------------------------------------------------------------------------

interface TestCase {
  name: string;
  minerals?: [number, number];
  volatiles?: [number, number];
  isotopes?: [number, number];
  water?: [number, number];
  actual: {
    minerals?: number;
    volatiles?: number;
    isotopes?: number;
    water?: number;
  };
}

let passed = 0;
let failed = 0;

function check(testName: string, resource: string, actual: number, range: [number, number]): void {
  const ok = actual >= range[0] && actual <= range[1];
  if (ok) {
    console.log(`  PASS  ${testName} — ${resource}: ${actual} in [${range[0]}, ${range[1]}]`);
    passed++;
  } else {
    console.error(`  FAIL  ${testName} — ${resource}: ${actual} NOT in [${range[0]}, ${range[1]}]`);
    failed++;
  }
}

console.log('\n=== v169 Planet Resource Balance Validation (integration) ===\n');

// ── Test 1: Earth-like ─────────────────────────────────────────────────────
{
  const stocks = generatePlanetStocks(earthPlanet);
  const tc: TestCase = {
    name: 'Earth-like (1.0 M_E, habitable)',
    minerals: [35_000, 65_000],  // anchor ~50k, ±30% for generation variation
    volatiles: [20_000, 40_000], // anchor ~30k, ±30%
    isotopes:  [3_500,  7_000],  // anchor ~5k, ±30%
    water:     [30_000, 52_000], // anchor ~40k (ocean + tiny ice cap)
    actual: { ...stocks.initial },
  };
  console.log(`[${tc.name}]`);
  if (tc.minerals) check(tc.name, 'minerals', tc.actual.minerals!, tc.minerals);
  if (tc.volatiles) check(tc.name, 'volatiles', tc.actual.volatiles!, tc.volatiles);
  if (tc.isotopes) check(tc.name, 'isotopes', tc.actual.isotopes!, tc.isotopes);
  if (tc.water) check(tc.name, 'water', tc.actual.water!, tc.water);
  console.log('');
}

// ── Test 2: Mars-like ──────────────────────────────────────────────────────
{
  const stocks = generatePlanetStocks(marsPlanet);
  const tc: TestCase = {
    name: 'Mars-like (0.107 M_E, inner, volatile x0.3)',
    minerals: [3_000, 9_000],
    volatiles: [200, 1_500],
    isotopes:  [200, 1_000],
    water:     [0, 3_000],  // small ice cap only
    actual: { ...stocks.initial },
  };
  console.log(`[${tc.name}]`);
  if (tc.minerals) check(tc.name, 'minerals', tc.actual.minerals!, tc.minerals);
  if (tc.volatiles) check(tc.name, 'volatiles', tc.actual.volatiles!, tc.volatiles);
  if (tc.isotopes) check(tc.name, 'isotopes', tc.actual.isotopes!, tc.isotopes);
  if (tc.water) check(tc.name, 'water', tc.actual.water!, tc.water);
  console.log('');
}

// ── Test 3: Europa-like ────────────────────────────────────────────────────
{
  const stocks = generatePlanetStocks(europaPlanet);
  const tc: TestCase = {
    name: 'Europa-like (0.008 M_E, dwarf, icy, subsurface)',
    minerals: [100, 600],
    volatiles: [100, 900],
    isotopes:  [10, 100],
    // Ice cap (r=0.245, f=0.9) ≈ 8k  +  subsurface bonus 15k = ~23k; must be > 5k
    water:     [5_000, 35_000],
    actual: { ...stocks.initial },
  };
  console.log(`[${tc.name}]`);
  if (tc.minerals) check(tc.name, 'minerals', tc.actual.minerals!, tc.minerals);
  if (tc.volatiles) check(tc.name, 'volatiles', tc.actual.volatiles!, tc.volatiles);
  if (tc.isotopes) check(tc.name, 'isotopes', tc.actual.isotopes!, tc.isotopes);
  if (tc.water) check(tc.name, 'water', tc.actual.water!, tc.water);
  console.log('');
}

// ── Test 4: Jupiter-like (gas-giant water must be exactly 0) ───────────────
{
  const stocks = generatePlanetStocks(jupiterPlanet);
  const tc: TestCase = {
    name: 'Jupiter-like (gas-giant)',
    water: [0, 0],  // gas-giant rule: no surface extractable water
    actual: { water: stocks.initial.water },
  };
  console.log(`[${tc.name}]`);
  if (tc.water) check(tc.name, 'water', tc.actual.water!, tc.water);
  console.log('');
}

// ── Test 5: Neptune-like (ice-giant water = 15% of volatiles) ─────────────
{
  const stocks = generatePlanetStocks(neptunePlanet);
  const expectedWater = Math.round(stocks.initial.volatiles * 0.15);
  const tc: TestCase = {
    name: 'Neptune-like (ice-giant, water = 15% of volatiles)',
    // water must be exactly 15% of volatiles (as per planet-stocks.ts rule)
    water: [Math.round(expectedWater * 0.99), Math.round(expectedWater * 1.01)],
    actual: { water: stocks.initial.water },
  };
  console.log(`[${tc.name}]`);
  if (tc.water) check(tc.name, 'water', tc.actual.water!, tc.water);
  console.log('');
}

// ── Test 6: ELEMENT_GROUP sanity (O must be mineral, S must be volatile, U isotope) ──
{
  console.log('[ELEMENT_GROUP classification]');
  const assertions: Array<[string, string]> = [
    ['O',  'mineral'],   // v169 fix: bound oxygen in silicates is mineral
    ['Fe', 'mineral'],
    ['Si', 'mineral'],
    ['H',  'volatile'],
    ['S',  'volatile'],
    ['C',  'volatile'],
    ['U',  'isotope'],
    ['Th', 'isotope'],
    ['Ra', 'isotope'],
  ];
  for (const [el, expectedGroup] of assertions) {
    const actual = ELEMENT_GROUP[el];
    const ok = actual === expectedGroup;
    if (ok) {
      console.log(`  PASS  ELEMENT_GROUP[${el}] === '${expectedGroup}'`);
      passed++;
    } else {
      console.error(`  FAIL  ELEMENT_GROUP[${el}] === '${actual}' (expected '${expectedGroup}')`);
      failed++;
    }
  }
  console.log('');
}

console.log(`=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  process.exit(1);
}
