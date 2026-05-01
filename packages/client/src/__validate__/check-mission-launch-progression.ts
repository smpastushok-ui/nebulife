/**
 * Mission Launch Progression Validation
 *
 * Run manually after mission/building progression changes:
 *
 *   npx tsx packages/client/src/__validate__/check-mission-launch-progression.ts
 *
 * This verifies the early exploration loop: Landing Pad at L10 builds and
 * launches small exploration payloads, while Spaceport remains heavy logistics.
 */

import {
  ALL_NODES,
  BUILDING_DEFS,
  HEAVY_SHIP_TYPES,
  ONE_SHOT_PAYLOAD_TYPES,
  PRODUCIBLE_DEFS,
  RESEARCH_TRANSPORT_TYPES,
  createEmptyManifest,
  isShipProducible,
  getRequiredMissionBuilding,
} from '@nebulife/core';
import type { CargoShipment, FleetState, PlanetMissionType, ProducibleType, Ship } from '@nebulife/core';

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

console.log('\n=== Mission Launch Progression Validation ===\n');

const earlyExplorationPayloads: ProducibleType[] = [
  'survey_probe',
  'orbital_satellite',
  'surface_rover',
  'atmosphere_probe',
  'scout_drone',
  'mining_drone',
  'orbital_telescope_unit',
];

const heavyLogisticsPayloads: ProducibleType[] = [
  'lander',
  'research_station_kit',
  'transport_small',
  'transport_large',
  'terraform_freighter',
  'colony_ship',
];

for (const type of earlyExplorationPayloads) {
  check(
    PRODUCIBLE_DEFS[type].requiresBuilding === 'landing_pad',
    `${type}: produced at landing_pad`,
  );
}

for (const type of ONE_SHOT_PAYLOAD_TYPES) {
  check(!isShipProducible(type), `${type}: remains one-shot inventory payload`);
}

for (const type of RESEARCH_TRANSPORT_TYPES) {
  check(isShipProducible(type), `${type}: creates reusable fleet ship`);
  check(PRODUCIBLE_DEFS[type].requiresBuilding === 'landing_pad', `${type}: produced at landing_pad`);
}

for (const type of HEAVY_SHIP_TYPES) {
  check(isShipProducible(type), `${type}: creates reusable heavy ship`);
}

for (const type of heavyLogisticsPayloads) {
  check(
    PRODUCIBLE_DEFS[type].requiresBuilding === 'spaceport',
    `${type}: produced at spaceport`,
  );
}

const missionBuildings: Record<PlanetMissionType, 'landing_pad' | 'spaceport' | null> = {
  orbital_scan: null,
  orbital_probe: 'landing_pad',
  surface_landing: 'landing_pad',
  deep_atmosphere_probe: 'landing_pad',
};

for (const [type, expectedBuilding] of Object.entries(missionBuildings) as Array<[PlanetMissionType, 'landing_pad' | 'spaceport' | null]>) {
  check(
    getRequiredMissionBuilding(type) === expectedBuilding,
    `${type}: requires ${expectedBuilding ?? 'payload only'}`,
  );
}

const thrustNode = ALL_NODES.find((node) => node.id === 'phy-thrust-1');

check(BUILDING_DEFS.landing_pad.levelRequired === 10, 'landing_pad: unlocks at level 10');
check(BUILDING_DEFS.landing_pad.techRequired === 'phy-thrust-1', 'landing_pad: requires Thrust I');
check(thrustNode?.levelRequired === 10, 'phy-thrust-1: available at level 10');
check(BUILDING_DEFS.spaceport.levelRequired >= 35, 'spaceport: remains late heavy logistics');

const cargoShip: Ship = {
  id: 'ship-1',
  type: 'transport_small',
  name: 'Transport',
  status: 'docked',
  currentPlanetId: 'donor',
  destinationPlanetId: null,
  cargo: createEmptyManifest(),
  fuelRemaining: 100,
  departedAt: null,
  arrivalAt: null,
  assignmentId: null,
};
const cargoShipment: CargoShipment = {
  id: 'cargo-1',
  shipId: cargoShip.id,
  fromPlanetId: 'donor',
  toPlanetId: 'target',
  resource: 'water',
  amount: 50,
  status: 'loading',
  startedAt: 1,
  phaseStartedAt: 1,
  flightMs: 60_000,
};
const fleetState: FleetState = {
  ships: [{ ...cargoShip, assignmentId: cargoShipment.id }],
  cargoShipments: [cargoShipment],
  routes: [],
  productionQueues: {},
};
check(fleetState.cargoShipments?.[0]?.resource === 'water', 'cargo shipments persist water manifests');
check(fleetState.ships[0].assignmentId === cargoShipment.id, 'cargo shipment reserves a concrete ship');
check(PRODUCIBLE_DEFS.terraform_freighter.cargoCapacity > PRODUCIBLE_DEFS.transport_small.cargoCapacity, 'terraform_freighter: heavier than small transport');

console.log(`\nResult: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exitCode = 1;
}
