/**
 * Civilization Determinism Validation
 *
 * Run manually after civilization generation / gating changes:
 *
 *   npx tsx packages/client/src/__validate__/check-civilization-determinism.ts
 *
 * Verifies NEXT_GEN_PLAN §B's core rule: "one seed → identical civilization".
 * Also sanity-checks eligibility gating (core depth >= 2, solid planets only)
 * and that the ~3-5% appearance rate holds across a large sample.
 */

import {
  generateGalaxyGroupCore,
  generateCoreStarSystem,
  generateCivilization,
  isCivilizationEligiblePlanet,
  CIVILIZATION_MIN_CORE_DEPTH,
} from '@nebulife/core';
import type { Civilization, Planet } from '@nebulife/core';

let passed = 0;
let failed = 0;

function check(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  PASS  ${message}`);
    passed++;
  } else {
    console.error(`  FAIL  ${message}`);
    failed++;
  }
}

console.log('\n=== Civilization Determinism Validation ===\n');

function civEqual(a: Civilization | null, b: Civilization | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.id === b.id
    && a.planetId === b.planetId
    && a.planetSeed === b.planetSeed
    && a.techEra === b.techEra
    && a.population === b.population
    && a.temperament === b.temperament
    && a.aestheticSeed === b.aestheticSeed
  );
}

// ── Gather a large sample of (planet, coreDepth) pairs from a few galaxy seeds ──

const SAMPLE_GALAXY_SEEDS = [42, 1337, 90210];
const planetsWithDepth: Array<{ planet: Planet; depth: number }> = [];

for (const galaxySeed of SAMPLE_GALAXY_SEEDS) {
  const core = generateGalaxyGroupCore(galaxySeed);
  // Sample every core system at depth >= 2 (skip depth 0/1 entry-adjacent systems
  // for the main sample; they're covered separately below).
  for (const coreSys of core.systems) {
    if (coreSys.depth < 2) continue;
    const system = generateCoreStarSystem(coreSys);
    for (const planet of system.planets) {
      planetsWithDepth.push({ planet, depth: coreSys.depth });
    }
  }
}

check(planetsWithDepth.length > 500, `sample size is large enough (${planetsWithDepth.length} planets)`);

// ── 1. Determinism: regenerating from the same seed always matches ──

let mismatches = 0;
for (const { planet, depth } of planetsWithDepth) {
  const a = generateCivilization(planet, depth);
  const b = generateCivilization(planet, depth);
  if (!civEqual(a, b)) mismatches++;
}
check(mismatches === 0, `same seed -> identical civilization for all ${planetsWithDepth.length} sampled planets`);

// ── 2. A totally independent re-derivation (fresh planet object, same seed) matches too ──

{
  const core = generateGalaxyGroupCore(SAMPLE_GALAXY_SEEDS[0]);
  const deepSystem = core.systems.find((s) => s.depth >= 3);
  if (deepSystem) {
    const systemA = generateCoreStarSystem(deepSystem);
    const systemB = generateCoreStarSystem(deepSystem);
    let rebuiltMismatch = false;
    for (let i = 0; i < systemA.planets.length; i++) {
      const civA = generateCivilization(systemA.planets[i], deepSystem.depth);
      const civB = generateCivilization(systemB.planets[i], deepSystem.depth);
      if (!civEqual(civA, civB)) rebuiltMismatch = true;
    }
    check(!rebuiltMismatch, 'independently regenerated star system yields identical civilizations');
  } else {
    check(false, 'expected at least one depth>=3 core system in seed 42 sample');
  }
}

// ── 3. Eligibility gating: depth < 2 never hosts a civilization ──

let depthGateViolation = false;
for (const { planet } of planetsWithDepth.slice(0, 200)) {
  for (const depth of [0, 1]) {
    if (isCivilizationEligiblePlanet(planet, depth)) depthGateViolation = true;
    if (generateCivilization(planet, depth) !== null) depthGateViolation = true;
  }
}
check(!depthGateViolation, `no civilization is eligible below core depth ${CIVILIZATION_MIN_CORE_DEPTH}`);

// ── 4. Gas/ice giants and dwarfs never host a civilization ──

let nonSolidViolation = false;
for (const { planet, depth } of planetsWithDepth) {
  if (planet.type === 'gas-giant' || planet.type === 'ice-giant' || planet.type === 'dwarf') {
    if (generateCivilization(planet, depth) !== null) nonSolidViolation = true;
  }
}
check(!nonSolidViolation, 'gas giants, ice giants, and dwarfs never host a civilization');

// ── 5. Appearance rate among eligible (solid, depth>=2) planets lands near 3-5% ──

const eligible = planetsWithDepth.filter(({ planet, depth }) => isCivilizationEligiblePlanet(planet, depth));
const hits = eligible.filter(({ planet, depth }) => generateCivilization(planet, depth) !== null);
const rate = eligible.length > 0 ? hits.length / eligible.length : 0;
check(eligible.length > 200, `enough eligible (solid, depth>=2) planets to estimate rate (${eligible.length})`);
check(rate >= 0.01 && rate <= 0.09, `civilization rate among eligible planets is close to target ~3-5% (got ${(rate * 100).toFixed(2)}%)`);

console.log(`\nResult: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exitCode = 1;
}
