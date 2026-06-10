// ---------------------------------------------------------------------------
// Fleet rules — pure helpers for terraform delivery missions
// ---------------------------------------------------------------------------
//
// Design notes:
//  - Phase 0 only checks buildings to determine tier; tech gate for tier 3
//    (phy-warp-1) will be wired in Phase 1 once App.tsx is updated.
//    `tierForBuildings` accepts an optional `techResearched` map for callers
//    that already have it available.
//  - All durations are in milliseconds (consistent with Date.now() usage).
//  - `tickMission` is a pure function that must be called with the current
//    wall-clock time; repeated calls with the same `now` are idempotent.

import type { PlacedBuilding, BuildingType } from '../types/surface.js';
import type { Mission, MissionPhase, ResourceCost, ShipTier } from '../types/terraform.js';
import {
  TF_FLIGHT_HOURS_PER_SQRT_LY,
  TF_FLIGHT_MIN_HOURS,
  TF_FLIGHT_MAX_HOURS,
  TF_REPAIR_K,
} from '../constants/terraform.js';

// ── Constants ────────────────────────────────────────────────────────────────

const DISPATCHING_MS = 5 * 60 * 1000;   // 5 minutes
const UNLOADING_MS   = 5 * 60 * 1000;   // 5 minutes

// Repair speed: 1 minute per 100 minerals of repair cost.
const REPAIR_MS_PER_100_MINERALS = 60 * 1000;

// ── Tier determination ───────────────────────────────────────────────────────

function hasBuildingType(buildings: PlacedBuilding[], type: BuildingType): boolean {
  return buildings.some((b) => b.type === type);
}

/**
 * Determine ship tier from colony buildings (and optionally researched tech).
 *
 * Returns 0 (untyped as ShipTier intentionally) when no landing infrastructure
 * exists — callers should check that `tier >= 1` before dispatching.
 *
 * Tier 3 requires both `spaceport` AND the `phy-warp-1` tech researched.
 * Pass `techResearched` = `state.researched` from TechTreeState if available;
 * omit (or pass undefined) to skip the warp tech check (only relevant in tests
 * or Phase 0 where tech isn't wired yet).
 */
export function tierForBuildings(
  buildings: PlacedBuilding[],
  techResearched?: Record<string, number>,
): ShipTier | 0 {
  const hasLandingPad = hasBuildingType(buildings, 'landing_pad');
  if (!hasLandingPad) return 0;

  const hasSpaceport = hasBuildingType(buildings, 'spaceport');
  if (!hasSpaceport) return 1;

  const hasWarp = Boolean(techResearched?.['phy-warp-1']);
  if (hasWarp) return 3;

  return 2;
}

// ── Tier specs ───────────────────────────────────────────────────────────────

/** Maximum cargo units per trip for each ship tier. */
export function tierMaxCargo(tier: ShipTier): number {
  switch (tier) {
    case 1: return 100;
    case 2: return 1000;
    case 3: return 5000;
  }
}

/**
 * One-way flight speed in light-years per game-hour.
 * Game-hour here means a real hour of play time for simplicity;
 * actual elapsed-ms mapping is done in `flightHoursLY`.
 */
export function tierSpeedLY(tier: ShipTier): number {
  switch (tier) {
    case 1: return 0.05;
    case 2: return 0.1;
    case 3: return 0.2;
  }
}

// ── Flight calculations ──────────────────────────────────────────────────────

/**
 * One-way flight time in game-hours for a given distance and tier.
 *
 * sqrt-compressed and hard-capped so endgame deliveries stay in HOURS even when
 * the donor colony is far from the target. With nearest-colony dispatch the hop
 * is usually small (~10-30 LY → 1-2h); the cap protects the worst case.
 * See TF_FLIGHT_* in constants/terraform.ts.
 */
export function flightHoursLY(distanceLY: number, tier: ShipTier): number {
  const k = TF_FLIGHT_HOURS_PER_SQRT_LY[tier];
  const raw = k * Math.sqrt(Math.max(0, distanceLY));
  return Math.min(TF_FLIGHT_MAX_HOURS, Math.max(TF_FLIGHT_MIN_HOURS, raw));
}

/**
 * Resource cost to repair the ship after one full round trip.
 * minerals = ceil(tierMaxCargo(tier) × TF_REPAIR_K × √distanceLY)
 * (sqrt-compressed distance so far hops cost more without exploding).
 */
export function repairCost(distanceLY: number, tier: ShipTier): ResourceCost {
  return {
    minerals: Math.ceil(tierMaxCargo(tier) * TF_REPAIR_K * Math.sqrt(Math.max(0, distanceLY))),
  };
}

// ── Mission tick ─────────────────────────────────────────────────────────────

/**
 * Advance a mission's phase based on the elapsed time since `phaseStartedAt`.
 * Returns a new Mission object; original is not mutated.
 *
 * Phase durations:
 *   dispatching → 5 min
 *   outbound    → flightHours × 3,600,000 ms
 *   unloading   → 5 min
 *   returning   → flightHours × 3,600,000 ms
 *   repairing   → ceil(repairCostMinerals / 100) × 60,000 ms
 *   idle        → stays idle
 */
export function tickMission(mission: Mission, now: number): Mission {
  const elapsed = now - mission.phaseStartedAt;
  const flightMs = mission.flightHours * 3_600_000;
  const repairMs = Math.ceil(mission.repairCostMinerals / 100) * REPAIR_MS_PER_100_MINERALS;

  const phaseDuration: Record<MissionPhase, number> = {
    dispatching: DISPATCHING_MS,
    outbound:    flightMs,
    unloading:   UNLOADING_MS,
    returning:   flightMs,
    repairing:   repairMs,
    idle:        Infinity,
  };

  const nextPhase: Record<MissionPhase, MissionPhase> = {
    dispatching: 'outbound',
    outbound:    'unloading',
    unloading:   'returning',
    returning:   'repairing',
    repairing:   'idle',
    idle:        'idle',
  };

  let current = mission.phase;
  let phaseStartedAt = mission.phaseStartedAt;

  // Advance through as many completed phases as the elapsed time allows.
  // This handles catch-up when a mission was not ticked for a long time.
  while (current !== 'idle') {
    const duration = phaseDuration[current];
    const elapsedInPhase = now - phaseStartedAt;
    if (elapsedInPhase < duration) break;

    phaseStartedAt = phaseStartedAt + duration;
    current = nextPhase[current];
  }

  if (current === mission.phase && phaseStartedAt === mission.phaseStartedAt) {
    return mission; // nothing changed — return same reference for caller deduplication
  }

  return { ...mission, phase: current, phaseStartedAt };
}
