import type { ProducibleType } from './logistics.js';

export type PlanetRevealLevel = 0 | 1 | 2 | 3;

export type PlanetMissionType =
  | 'orbital_scan'
  | 'orbital_probe'
  | 'surface_landing'
  | 'deep_atmosphere_probe';

export type PlanetMissionPhase =
  | 'preparing'
  | 'outbound'
  | 'orbital_insertion'
  | 'scan_or_landing'
  | 'data_downlink'
  | 'report_ready'
  | 'completed';

export interface PlanetMissionCost {
  researchData?: number;
  minerals?: number;
  volatiles?: number;
  isotopes?: number;
  water?: number;
  payload?: ProducibleType;
}

export interface PlanetMissionPhaseDurations {
  preparing: number;
  outbound: number;
  orbital_insertion: number;
  scan_or_landing: number;
  data_downlink: number;
}

export interface PlanetMission {
  id: string;
  systemId: string;
  planetId: string;
  type: PlanetMissionType;
  targetRevealLevel: PlanetRevealLevel;
  startedAt: number;
  durationMs: number;
  phaseDurations: PlanetMissionPhaseDurations;
  costPaid: PlanetMissionCost;
  originPlanetId?: string;
  originSystemId?: string;
  status: PlanetMissionPhase;
  completedAt?: number;
}

export interface PlanetReportSummary {
  planetId: string;
  systemId: string;
  missionId: string;
  missionType: PlanetMissionType;
  revealLevel: PlanetRevealLevel;
  generatedAt: number;
  headlineKey: string;
}

export interface PlanetMissionProgress {
  phase: PlanetMissionPhase;
  phaseProgress: number;
  overallProgress: number;
  elapsedMs: number;
  remainingMs: number;
}
