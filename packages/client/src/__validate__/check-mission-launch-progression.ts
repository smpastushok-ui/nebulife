/**
 * Mission Launch Progression Validation
 *
 * Run manually after mission/building progression changes:
 *
 *   npx tsx packages/client/src/__validate__/check-mission-launch-progression.ts
 *
 * This verifies the early exploration loop: payloads/carriers are produced by
 * colony infrastructure, while mission launch itself does not spend resources.
 */

import {
  ALL_NODES,
  BUILDING_DEFS,
  HEAVY_SHIP_TYPES,
  ONE_SHOT_PAYLOAD_TYPES,
  PRODUCIBLE_DEFS,
  RESEARCH_TRANSPORT_TYPES,
  canStartPlanetMission,
  createEmptyManifest,
  isShipProducible,
  getRequiredMissionBuilding,
  getRequiredMissionCarrier,
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
  'transport_small',
  'transport_large',
  'lander',
  'research_station_kit',
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
  orbital_probe: null,
  drone_recon: null,
  surface_landing: null,
  deep_atmosphere_probe: null,
};

for (const [type, expectedBuilding] of Object.entries(missionBuildings) as Array<[PlanetMissionType, 'landing_pad' | 'spaceport' | null]>) {
  check(
    getRequiredMissionBuilding(type) === expectedBuilding,
    `${type}: requires ${expectedBuilding ?? 'no launch building'}`,
  );
}

check(getRequiredMissionCarrier('orbital_probe') === 'research_shuttle', 'orbital_probe: requires research shuttle carrier');
check(getRequiredMissionCarrier('drone_recon') === 'research_shuttle', 'drone_recon: requires research shuttle carrier');
check(getRequiredMissionCarrier('surface_landing') === 'rover_dropcraft', 'surface_landing: requires rover dropcraft carrier');
check(getRequiredMissionCarrier('deep_atmosphere_probe') === 'atmo_probe_carrier', 'deep_atmosphere_probe: requires atmosphere probe carrier');

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

const missionPlanet = {
  id: 'mission-planet',
  type: 'rocky',
  orbit: { semiMajorAxisAU: 1 },
  surfaceTempK: 288,
  surfaceGravityG: 1,
} as const;
const missionResources = {
  researchData: 0,
  minerals: 0,
  volatiles: 0,
  isotopes: 0,
  water: 0,
};
const missionBuildingInventory = [{ id: 'pad-1', type: 'landing_pad', x: 0, y: 0, level: 1, builtAt: new Date(0).toISOString() }];
const missionPayloadInventory = {
  survey_probe: 1,
  orbital_satellite: 1,
  surface_rover: 1,
  atmosphere_probe: 1,
  scout_drone: 1,
};
const missionCarrierInventory = {
  research_shuttle: 1,
  rover_dropcraft: 1,
  atmo_probe_carrier: 1,
};

check(
  canStartPlanetMission({
    type: 'orbital_scan',
    planet: missionPlanet as never,
    revealLevel: 1,
    activeMissions: [],
    buildings: missionBuildingInventory as never,
    resources: missionResources,
    payloadInventory: missionPayloadInventory,
    carrierInventory: missionCarrierInventory,
  }).reason === 'already_revealed',
  'mission launch: completed orbital scan is blocked at T1',
);
check(
  canStartPlanetMission({
    type: 'orbital_probe',
    planet: missionPlanet as never,
    revealLevel: 1,
    activeMissions: [],
    buildings: missionBuildingInventory as never,
    resources: missionResources,
    payloadInventory: missionPayloadInventory,
    carrierInventory: missionCarrierInventory,
  }).canStart,
  'mission launch: orbital probe is available at T1',
);
check(
  canStartPlanetMission({
    type: 'orbital_probe',
    planet: missionPlanet as never,
    revealLevel: 1,
    activeMissions: [],
    buildings: [],
    resources: missionResources,
    payloadInventory: missionPayloadInventory,
    carrierInventory: {},
  }).reason === 'carrier_required',
  'mission launch: orbital probe requires research shuttle carrier',
);
check(
  canStartPlanetMission({
    type: 'orbital_probe',
    planet: missionPlanet as never,
    revealLevel: 1,
    activeMissions: [],
    buildings: [],
    resources: missionResources,
    payloadInventory: missionPayloadInventory,
    carrierInventory: missionCarrierInventory,
  }).canStart,
  'mission launch: orbital probe requires payload and carrier, not resources or landing pad',
);
check(
  canStartPlanetMission({
    type: 'orbital_probe',
    planet: missionPlanet as never,
    revealLevel: 2,
    activeMissions: [],
    buildings: missionBuildingInventory as never,
    resources: missionResources,
    payloadInventory: missionPayloadInventory,
    carrierInventory: missionCarrierInventory,
  }).reason === 'already_revealed',
  'mission launch: completed orbital probe is blocked at T2',
);
check(
  canStartPlanetMission({
    type: 'surface_landing',
    planet: missionPlanet as never,
    revealLevel: 2,
    activeMissions: [],
    buildings: missionBuildingInventory as never,
    resources: missionResources,
    payloadInventory: missionPayloadInventory,
    carrierInventory: missionCarrierInventory,
  }).canStart,
  'mission launch: surface expedition is available at T2',
);
check(
  canStartPlanetMission({
    type: 'surface_landing',
    planet: missionPlanet as never,
    revealLevel: 2,
    activeMissions: [],
    buildings: [],
    resources: missionResources,
    payloadInventory: missionPayloadInventory,
    carrierInventory: {},
  }).reason === 'carrier_required',
  'mission launch: surface expedition requires dropcraft carrier',
);
check(
  canStartPlanetMission({
    type: 'surface_landing',
    planet: missionPlanet as never,
    revealLevel: 2,
    activeMissions: [],
    buildings: [],
    resources: missionResources,
    payloadInventory: missionPayloadInventory,
    carrierInventory: missionCarrierInventory,
  }).canStart,
  'mission launch: surface expedition requires payload and carrier, not resources or landing pad',
);

console.log(`\nResult: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exitCode = 1;
}
