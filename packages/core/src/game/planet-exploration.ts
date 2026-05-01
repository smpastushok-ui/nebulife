import type { Planet } from '../types/planet.js';
import type { ProducibleType } from '../types/logistics.js';
import type { PlacedBuilding } from '../types/surface.js';
import type {
  PlanetMission,
  PlanetMissionCost,
  PlanetMissionPhase,
  PlanetMissionPhaseDurations,
  PlanetMissionProgress,
  PlanetMissionType,
  PlanetReportSummary,
  PlanetRevealLevel,
} from '../types/planet-exploration.js';

export interface PlanetMissionResources {
  researchData: number;
  minerals: number;
  volatiles: number;
  isotopes: number;
  water: number;
}

export interface PlanetMissionStartCheck {
  canStart: boolean;
  reason?: 'already_revealed' | 'active_mission' | 'building_required' | 'surface_unavailable' | 'resources_required' | 'payload_required';
  requiredBuilding?: 'landing_pad' | 'spaceport';
  requiredPayload?: ProducibleType;
  missingResources?: Partial<PlanetMissionResources>;
}

export function isSolidPlanetForLanding(planet: Planet): boolean {
  return planet.type === 'rocky' || planet.type === 'terrestrial' || planet.type === 'dwarf';
}

export function getTargetRevealLevel(type: PlanetMissionType): PlanetRevealLevel {
  if (type === 'orbital_scan') return 1;
  if (type === 'orbital_probe') return 2;
  return 3;
}

export function getRequiredMissionBuilding(type: PlanetMissionType): 'landing_pad' | 'spaceport' | null {
  if (type === 'orbital_scan') return null;
  if (type === 'orbital_probe' || type === 'surface_landing' || type === 'deep_atmosphere_probe') return 'landing_pad';
  return 'spaceport';
}

export function computePlanetMissionCost(type: PlanetMissionType, planet: Planet): PlanetMissionCost {
  const distance = Math.max(0.2, planet.orbit.semiMajorAxisAU);
  const giantMult = planet.type === 'gas-giant' || planet.type === 'ice-giant' ? 1.35 : 1;

  if (type === 'orbital_scan') {
    return {
      researchData: Math.ceil(10 + distance * 2),
      isotopes: Math.ceil(2 + distance * 0.5),
      payload: 'survey_probe',
    };
  }

  if (type === 'orbital_probe') {
    return {
      minerals: Math.ceil(30 * giantMult),
      volatiles: Math.ceil(18 * giantMult),
      isotopes: Math.ceil(8 + distance * 1.5 * giantMult),
      payload: 'orbital_satellite',
    };
  }

  if (type === 'deep_atmosphere_probe') {
    return {
      minerals: 45,
      volatiles: Math.ceil(45 + distance * 2),
      isotopes: Math.ceil(25 + distance * 2),
      payload: 'atmosphere_probe',
    };
  }

  return {
    minerals: 55,
    volatiles: 28,
    isotopes: Math.ceil(18 + distance * 1.5),
    water: Math.ceil(8 + Math.max(0, planet.surfaceTempK - 320) / 60),
    payload: 'surface_rover',
  };
}

export function computePlanetMissionDuration(type: PlanetMissionType, planet: Planet): PlanetMissionPhaseDurations {
  const distanceAU = Math.max(0.2, planet.orbit.semiMajorAxisAU);
  const giantMult = planet.type === 'gas-giant' || planet.type === 'ice-giant' ? 1.35 : 1;
  const riskMult = 1
    + Math.max(0, planet.surfaceGravityG - 1) * 0.2
    + Math.max(0, (planet.atmosphere?.surfacePressureAtm ?? 0) - 1) * 0.03
    + Math.max(0, Math.abs(planet.surfaceTempK - 288) - 80) * 0.002;

  const baseTravel = type === 'orbital_scan' ? 35_000 : 75_000;
  const outbound = Math.round(baseTravel + distanceAU * 28_000 * giantMult);

  if (type === 'orbital_scan') {
    return {
      preparing: 8_000,
      outbound,
      orbital_insertion: 5_000,
      scan_or_landing: 25_000,
      data_downlink: Math.round(16_000 + distanceAU * 8_000),
    };
  }

  if (type === 'orbital_probe') {
    return {
      preparing: 25_000,
      outbound,
      orbital_insertion: Math.round(18_000 * giantMult),
      scan_or_landing: Math.round(55_000 * giantMult),
      data_downlink: Math.round(35_000 + distanceAU * 12_000),
    };
  }

  if (type === 'deep_atmosphere_probe') {
    return {
      preparing: 40_000,
      outbound: Math.round(outbound * 1.25),
      orbital_insertion: 24_000,
      scan_or_landing: Math.round(95_000 * giantMult),
      data_downlink: Math.round(55_000 + distanceAU * 16_000),
    };
  }

  return {
    preparing: 35_000,
    outbound,
    orbital_insertion: 18_000,
    scan_or_landing: Math.round(80_000 * riskMult),
    data_downlink: Math.round(42_000 + distanceAU * 12_000),
  };
}

export function sumPlanetMissionDuration(phaseDurations: PlanetMissionPhaseDurations): number {
  return phaseDurations.preparing
    + phaseDurations.outbound
    + phaseDurations.orbital_insertion
    + phaseDurations.scan_or_landing
    + phaseDurations.data_downlink;
}

export function getPlanetMissionProgress(mission: PlanetMission, now: number): PlanetMissionProgress {
  if (mission.status === 'completed') {
    return { phase: 'completed', phaseProgress: 1, overallProgress: 1, elapsedMs: mission.durationMs, remainingMs: 0 };
  }

  const elapsed = Math.max(0, now - mission.startedAt);
  if (elapsed >= mission.durationMs) {
    return { phase: 'report_ready', phaseProgress: 1, overallProgress: 1, elapsedMs: mission.durationMs, remainingMs: 0 };
  }

  const phases: Array<[PlanetMissionPhase, number]> = [
    ['preparing', mission.phaseDurations.preparing],
    ['outbound', mission.phaseDurations.outbound],
    ['orbital_insertion', mission.phaseDurations.orbital_insertion],
    ['scan_or_landing', mission.phaseDurations.scan_or_landing],
    ['data_downlink', mission.phaseDurations.data_downlink],
  ];

  let cursor = 0;
  for (const [phase, duration] of phases) {
    const next = cursor + duration;
    if (elapsed < next) {
      return {
        phase,
        phaseProgress: duration <= 0 ? 1 : (elapsed - cursor) / duration,
        overallProgress: elapsed / mission.durationMs,
        elapsedMs: elapsed,
        remainingMs: mission.durationMs - elapsed,
      };
    }
    cursor = next;
  }

  return { phase: 'report_ready', phaseProgress: 1, overallProgress: 1, elapsedMs: mission.durationMs, remainingMs: 0 };
}

export function canStartPlanetMission(params: {
  type: PlanetMissionType;
  planet: Planet;
  revealLevel: PlanetRevealLevel;
  activeMissions: PlanetMission[];
  buildings: PlacedBuilding[];
  resources: PlanetMissionResources;
  payloadInventory?: Partial<Record<ProducibleType, number>>;
}): PlanetMissionStartCheck {
  const targetRevealLevel = getTargetRevealLevel(params.type);
  if (params.revealLevel >= targetRevealLevel) return { canStart: false, reason: 'already_revealed' };
  if (params.activeMissions.some((m) => m.planetId === params.planet.id && m.status !== 'completed' && m.status !== 'report_ready')) {
    return { canStart: false, reason: 'active_mission' };
  }

  if (params.type === 'surface_landing' && !isSolidPlanetForLanding(params.planet)) {
    return { canStart: false, reason: 'surface_unavailable' };
  }
  if (params.type === 'deep_atmosphere_probe' && isSolidPlanetForLanding(params.planet)) {
    return { canStart: false, reason: 'surface_unavailable' };
  }

  const requiredBuilding = getRequiredMissionBuilding(params.type);
  if (requiredBuilding && !params.buildings.some((b) => b.type === requiredBuilding && !b.shutdown)) {
    return { canStart: false, reason: 'building_required', requiredBuilding };
  }

  const cost = computePlanetMissionCost(params.type, params.planet);
  if (cost.payload && (params.payloadInventory?.[cost.payload] ?? 0) < 1) {
    return { canStart: false, reason: 'payload_required', requiredPayload: cost.payload };
  }

  const missing: Partial<PlanetMissionResources> = {};
  for (const key of ['researchData', 'minerals', 'volatiles', 'isotopes', 'water'] as const) {
    const amount = cost[key] ?? 0;
    if (params.resources[key] < amount) missing[key] = amount - params.resources[key];
  }
  if (Object.keys(missing).length > 0) {
    return { canStart: false, reason: 'resources_required', missingResources: missing };
  }

  return { canStart: true, requiredBuilding: requiredBuilding ?? undefined };
}

export function createPlanetMission(params: {
  id: string;
  type: PlanetMissionType;
  systemId: string;
  planet: Planet;
  startedAt: number;
  originPlanetId?: string;
  originSystemId?: string;
}): PlanetMission {
  const phaseDurations = computePlanetMissionDuration(params.type, params.planet);
  return {
    id: params.id,
    systemId: params.systemId,
    planetId: params.planet.id,
    type: params.type,
    targetRevealLevel: getTargetRevealLevel(params.type),
    startedAt: params.startedAt,
    durationMs: sumPlanetMissionDuration(phaseDurations),
    phaseDurations,
    costPaid: computePlanetMissionCost(params.type, params.planet),
    originPlanetId: params.originPlanetId,
    originSystemId: params.originSystemId,
    status: 'preparing',
  };
}

export function completePlanetMission(mission: PlanetMission, now: number): { mission: PlanetMission; report: PlanetReportSummary } {
  const completed: PlanetMission = {
    ...mission,
    status: 'report_ready',
    completedAt: mission.completedAt ?? now,
  };

  return {
    mission: completed,
    report: {
      planetId: mission.planetId,
      systemId: mission.systemId,
      missionId: mission.id,
      missionType: mission.type,
      revealLevel: mission.targetRevealLevel,
      generatedAt: now,
      headlineKey: `planet_missions.report.${mission.type}`,
    },
  };
}
