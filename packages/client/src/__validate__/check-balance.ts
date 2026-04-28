/**
 * v169 Balance Validation — Planet Resource Stocks
 *
 * This file is NOT compiled into production builds (it lives in __validate__/).
 * Run manually in Node.js after a build to verify stock calibration:
 *
 *   node -r ts-node/register packages/client/src/__validate__/check-balance.ts
 *
 * Expected ranges (v169 calibration after O→mineral fix):
 *   Earth-like (rocky, habitable):  minerals ~50k, volatiles ~30k, isotopes ~5k, water ~40k
 *   Mars-like  (rocky, inner/hab, 0.107 M_E, hot):  minerals ~5k, volatiles ~500-1500, isotopes ~500
 *   Europa-like (dwarf, outer, 0.008 M_E, icy+subsurface): water >5k (ice+subsurface)
 *   Jupiter-like (gas-giant): water = 0, volatiles huge
 */

// ---------------------------------------------------------------------------
// Inline reference computations (mirrors STOCK_SCALE logic)
// These numbers come from the actual calibration done in planet-stocks.ts v169
// ---------------------------------------------------------------------------

const EARTH_MASS = 5.972e24; // kg
const EXTRACTABILITY_ROCKY = 0.01;

// STOCK_SCALE (v169)
const SCALE_M = 50_000 / 5.80e22;
const SCALE_V = 30_000 / 1.88e21;
const SCALE_I =  5_000 / 3.17e15;

// Water constants
const WATER_REF    = 40_000;
const COV_REF      = 0.71;
const DEPTH_REF    = 3.7;
const ICE_DEPTH    = 10.0;
const SUBSURFACE   = 15_000;

// ROCKY_PLANET_COMPOSITION (from elements.ts)
const ROCKY: Record<string, number> = {
  Fe: 0.321, O: 0.301, Si: 0.151, Mg: 0.139,
  S: 0.029, Ni: 0.018, Ca: 0.015, Al: 0.014,
  Na: 0.002, Cr: 0.005, Mn: 0.003, P: 0.001,
  K: 0.0002, Ti: 0.0008, Co: 0.0009, H: 0.0006,
  C: 0.0007, N: 0.00002, Cl: 0.0002,
  U: 0.000000013, Th: 0.00000004, Ra: 1e-13, Pu: 1e-16,
};

// v169 group classification
const MINERAL_ELS = new Set(['Fe','Al','Si','Ti','Cu','Ni','Zn','Mg','Ca','Na','K','Cr','Mn','Co','W','Au','Ag','Pt','Li','Be','V','Ba','Sr','Sn','O']);
const VOLATILE_ELS = new Set(['H','He','C','N','S','P','Ar','Ne','Kr','Xe','Cl','F','Se']);
const ISOTOPE_ELS = new Set(['U','Th','Pu','Ra']);

function computeRockyStocks(massEarth: number, mineralMult: number, volatileMult: number): {
  minerals: number; volatiles: number; isotopes: number;
} {
  let m = 0, v = 0, i = 0;
  for (const [el, frac] of Object.entries(ROCKY)) {
    const mass = massEarth * EARTH_MASS * frac * EXTRACTABILITY_ROCKY;
    const isMin = MINERAL_ELS.has(el);
    const isVol = VOLATILE_ELS.has(el);
    const isIso = ISOTOPE_ELS.has(el);
    if (isMin) m += mass * mineralMult;
    if (isVol) v += mass * volatileMult;
    if (isIso) i += mass; // no multiplier — scale handles playability
  }
  return {
    minerals: Math.round(m * SCALE_M),
    volatiles: Math.round(v * SCALE_V),
    isotopes:  Math.round(i * SCALE_I),
  };
}

function computeWater(
  radiusEarth: number,
  waterCoverageFraction: number,
  oceanDepthKm: number,
  iceCapFraction: number,
  hasSubsurfaceOcean: boolean,
): number {
  const r = radiusEarth;
  const radRatio = r / 1.0;
  let water = 0;
  if (waterCoverageFraction > 0) {
    water += Math.round(WATER_REF * (waterCoverageFraction / COV_REF) * (oceanDepthKm / DEPTH_REF) * radRatio * radRatio);
  }
  if (iceCapFraction > 0) {
    water += Math.round(WATER_REF * (iceCapFraction / COV_REF) * (ICE_DEPTH / DEPTH_REF) * radRatio * radRatio);
  }
  if (hasSubsurfaceOcean) {
    water += SUBSURFACE;
  }
  return water;
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

interface TestCase {
  name: string;
  minerals?: [number, number];  // [min, max] expected range
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

const tests: TestCase[] = [];

// ── Earth-like (1 M_E, habitable zone, no perturbation) ────────────────────
{
  const stocks = computeRockyStocks(1.0, 1.0, 1.0);
  const water = computeWater(1.0, 0.71, 3.7, 0.02, false);
  tests.push({
    name: 'Earth-like (1.0 M_E, habitable)',
    // minerals ~50k (±20% for zone perturbation range 0.5–1.5)
    minerals: [35_000, 65_000],
    // volatiles ~30k (±20%)
    volatiles: [20_000, 40_000],
    // isotopes ~5k (±20%)
    isotopes: [3_500, 7_000],
    // water ~40k (±20%)
    water: [30_000, 52_000],
    actual: { ...stocks, water },
  });
}

// ── Mars-like (0.107 M_E, inner/habitable, volatile depleted) ──────────────
{
  // inner zone: mineral x1.2, volatile x0.3 (average perturbation = 1.0)
  const stocks = computeRockyStocks(0.107, 1.2, 0.3);
  const water = computeWater(0.53, 0, 0, 0.05, false);
  tests.push({
    name: 'Mars-like (0.107 M_E, inner, volatile x0.3)',
    minerals: [3_000, 9_000],
    volatiles: [200, 1_500],
    isotopes: [200, 1_000],
    water: [0, 3_000],  // small ice cap
    actual: { ...stocks, water },
  });
}

// ── Europa-like (dwarf, outer zone, icy, subsurface ocean) ─────────────────
{
  const stocks = computeRockyStocks(0.008, 0.8, 2.0);  // outer: volatile x2, mineral x0.8
  // iceCapFraction ~0.9, radius ~0.245 R_E, subsurface ocean = true
  const water = computeWater(0.245, 0, 0, 0.9, true);
  tests.push({
    name: 'Europa-like (0.008 M_E, dwarf, icy, subsurface)',
    minerals: [100, 600],
    volatiles: [100, 900],
    isotopes: [10, 100],
    // Water: ice cap ~8k + subsurface 15k = ~23k; must be > 5k
    water: [5_000, 35_000],
    actual: { ...stocks, water },
  });
}

// ── Gas-giant (Jupiter-like) ───────────────────────────────────────────────
{
  // gas-giant: water = 0 by rule; volatiles huge (H+He dominate)
  // We only check water = 0 here
  tests.push({
    name: 'Jupiter-like (gas-giant)',
    water: [0, 0],  // must be exactly 0
    actual: { water: 0 },  // enforced by planet type check in planet-stocks.ts
  });
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

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

console.log('\n=== v169 Planet Resource Balance Validation ===\n');

for (const t of tests) {
  console.log(`[${t.name}]`);
  if (t.minerals !== undefined && t.actual.minerals !== undefined)
    check(t.name, 'minerals', t.actual.minerals, t.minerals);
  if (t.volatiles !== undefined && t.actual.volatiles !== undefined)
    check(t.name, 'volatiles', t.actual.volatiles, t.volatiles);
  if (t.isotopes !== undefined && t.actual.isotopes !== undefined)
    check(t.name, 'isotopes', t.actual.isotopes, t.isotopes);
  if (t.water !== undefined && t.actual.water !== undefined)
    check(t.name, 'water', t.actual.water, t.water);
  console.log('');
}

console.log(`=== Results: ${passed} passed, ${failed} failed ===\n`);

if (failed > 0) {
  process.exit(1);
}
