// ---------------------------------------------------------------------------
// Terraforming — core types shared across all phases of the feature
// ---------------------------------------------------------------------------

/** The six independent parameters that must reach target thresholds
 *  before a planet is considered fully terraformed. */
export type TerraformParamId =
  | 'magneticField'
  | 'atmosphere'
  | 'ozone'
  | 'temperature'
  | 'pressure'
  | 'water';

/** Progress state for a single terraforming parameter. */
export interface TerraformParamState {
  /** 0..100 — percentage of target achieved. */
  progress: number;
  /** Unix-ms timestamp of the last resource delivery, or null if never. */
  lastDeliveryAt: number | null;
}

/** All terraforming progress data for a single planet. */
export interface PlanetTerraformState {
  planetId: string;
  params: Record<TerraformParamId, TerraformParamState>;
  /** Unix-ms timestamp when overallProgress first crossed the completion
   *  threshold, or null while still in progress. */
  completedAt: number | null;
}

/** Ship capability tier.  1 = landing_pad only, 2 = spaceport, 3 = warp. */
export type ShipTier = 1 | 2 | 3;

/** Lifecycle phase of a terraforming delivery mission. */
export type MissionPhase =
  | 'dispatching'   // loading at donor colony (5 min)
  | 'outbound'      // travelling to target planet
  | 'unloading'     // applying resources at destination (5 min)
  | 'returning'     // empty ship heading home
  | 'repairing'     // post-return repair before next mission
  | 'idle';         // ready for a new mission

/** A single resource-delivery mission assigned to a terraforming parameter. */
export interface Mission {
  id: string;
  /** Planet ID of the colony sending resources. */
  donorPlanetId: string;
  /** Planet ID being terraformed. */
  targetPlanetId: string;
  paramId: TerraformParamId;
  resource: 'minerals' | 'volatiles' | 'isotopes' | 'water';
  /** Amount of resource loaded at dispatch time. */
  amount: number;
  tier: ShipTier;
  phase: MissionPhase;
  /** Unix-ms when the mission was first created. */
  startedAt: number;
  /** Unix-ms when the current phase began — used for phase duration calc. */
  phaseStartedAt: number;
  /** One-way flight duration in game-hours (constant for this mission). */
  flightHours: number;
  /** Minerals required to repair the ship after it returns. */
  repairCostMinerals: number;
}

/** Generic resource cost record — absent keys mean zero cost for that resource. */
export interface ResourceCost {
  minerals?: number;
  volatiles?: number;
  isotopes?: number;
  water?: number;
}
