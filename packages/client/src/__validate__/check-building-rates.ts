/**
 * Building Detail Rate Validation
 *
 * Run manually after rate-display changes:
 *
 *   npx tsx packages/client/src/__validate__/check-building-rates.ts
 *
 * This validates the UI-facing building detail model, not the colony tick.
 */

import { BUILDING_DEFS } from '@nebulife/core';
import type { BuildingType, PlacedBuilding, Planet } from '@nebulife/core';
import { deriveBuildingDetailStats } from '../ui/components/ColonyCenter/building-detail-model.js';

const EPSILON = 0.0001;

let passed = 0;
let failed = 0;

function pass(message: string): void {
  console.log(`  PASS  ${message}`);
  passed++;
}

function fail(message: string): void {
  console.error(`  FAIL  ${message}`);
  failed++;
}

function near(actual: number, expected: number): boolean {
  return Math.abs(actual - expected) <= EPSILON;
}

function check(condition: boolean, message: string): void {
  if (condition) pass(message);
  else fail(message);
}

const testPlanet = {
  id: 'rate-test-planet',
  seed: 12345,
  name: 'Rate Test Planet',
  type: 'terrestrial',
  zone: 'habitable',
  orbit: { semiMajorAxisAU: 1 },
  atmosphere: { surfacePressureAtm: 1 },
} as Planet;

function makeBuilding(type: BuildingType): PlacedBuilding {
  return {
    id: `test-${type}`,
    type,
    x: 0,
    y: 0,
    level: 1,
    builtAt: new Date(0).toISOString(),
  };
}

console.log('\n=== Building Detail Rate Validation ===\n');

for (const [type, def] of Object.entries(BUILDING_DEFS) as Array<[BuildingType, (typeof BUILDING_DEFS)[BuildingType]]>) {
  const building = makeBuilding(type);
  const stats = deriveBuildingDetailStats({
    type,
    planet: testPlanet,
    buildings: [building],
    building,
  });

  check(
    !def.production.some((row) => row.resource === 'energy') &&
      !def.consumption.some((row) => row.resource === 'energy'),
    `${type}: energy is defined only via energyOutput/energyConsumption`,
  );

  check(
    stats.production.every((row) => row.perHour > 0),
    `${type}: production rows are positive`,
  );

  check(
    stats.consumption.every((row) => row.perHour < 0),
    `${type}: consumption rows are negative`,
  );

  const productionEnergy = stats.production.find((row) => row.resource === 'energy');
  const consumptionEnergy = stats.consumption.find((row) => row.resource === 'energy');

  check(
    def.energyOutput > 0
      ? Boolean(productionEnergy && near(productionEnergy.perHour, def.energyOutput * 60))
      : productionEnergy === undefined,
    `${type}: energy output row matches +/h output`,
  );

  check(
    def.energyConsumption > 0
      ? Boolean(consumptionEnergy && near(consumptionEnergy.perHour, -def.energyConsumption * 60))
      : consumptionEnergy === undefined,
    `${type}: energy consumption row matches -/h consumption`,
  );
}

{
  const greenhouse = makeBuilding('greenhouse');
  const stats = deriveBuildingDetailStats({
    type: 'greenhouse',
    planet: testPlanet,
    buildings: [greenhouse],
    building: greenhouse,
  });

  check(
    near(stats.production.find((row) => row.resource === 'food')?.perHour ?? 0, 500),
    'greenhouse: food production is +500/h',
  );
  check(
    near(stats.consumption.find((row) => row.resource === 'energy')?.perHour ?? 0, -240),
    'greenhouse: energy consumption is -240/h',
  );
  check(
    near(stats.consumption.find((row) => row.resource === 'water')?.perHour ?? 0, -3.6),
    'greenhouse: water consumption is -3.6/h',
  );
  check(
    near(stats.consumption.find((row) => row.resource === 'volatiles')?.perHour ?? 0, -1.2),
    'greenhouse: volatiles consumption is -1.2/h',
  );
}

{
  const battery = makeBuilding('battery_station');
  const stats = deriveBuildingDetailStats({
    type: 'battery_station',
    planet: testPlanet,
    buildings: [battery],
    building: battery,
  });

  check(
    stats.energyStorageAdd === 2400,
    'battery_station: storage capacity is +2400',
  );
}

console.log(`\nResult: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exitCode = 1;
}
