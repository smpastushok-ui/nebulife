// ---------------------------------------------------------------------------
// Terraforming rules — pure, deterministic, no side effects
// ---------------------------------------------------------------------------
//
// Design notes:
//  - All functions return new objects; callers are responsible for persisting.
//  - `techState` is typed as `TechTreeState` from tech-tree.ts for gate checks;
//    pass `createTechTreeState()` to opt-out of tech gates in tests.
//  - `ozone` has no corresponding factor in `HabitabilityFactors`; its initial
//    progress is derived from `planet.atmosphere.hasOzone` (true = 80, else 0).
//  - `pressure` is derived from `atmosphere.surfacePressureAtm`: 1 atm → 100;
//    we use a log-based mapping so extreme pressures compress into 0..100.

import type { Planet } from '../types/planet.js';
import type { TerraformParamId, TerraformParamState, PlanetTerraformState, ResourceCost } from '../types/terraform.js';
import type { TechTreeState } from './tech-tree.js';
import {
  TF_BASE_COSTS,
  TF_COMPLETION_THRESHOLD,
  TF_SIZE_MULT,
  planetSizeBucket,
} from '../constants/terraform.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function emptyParam(): TerraformParamState {
  return { progress: 0, lastDeliveryAt: null };
}

/**
 * Map surface pressure (atm) to a 0..100 progress score.
 * 1.0 atm → 100.  Uses a log scale so that both very thin (0.001 atm)
 * and very thick (90 atm) atmospheres map to a non-zero starting point
 * rather than -Infinity or a flat cliff.
 *
 * Formula: 100 * (1 - |log10(p)| / 2), clamped 0..100.
 * - p=1    → 100
 * - p=0.1  → 50
 * - p=10   → 50
 * - p=0.01 → 0
 */
function pressureProgress(surfacePressureAtm: number): number {
  if (surfacePressureAtm <= 0) return 0;
  const logDev = Math.abs(Math.log10(surfacePressureAtm));
  return clamp(Math.round(100 * (1 - logDev / 2)), 0, 100);
}

// ── Public functions ─────────────────────────────────────────────────────────

/** Returns true only for solid-surface planet types that can be terraformed. */
export function isTerraformable(planet: Planet): boolean {
  return planet.type === 'rocky'
      || planet.type === 'terrestrial'
      || planet.type === 'dwarf';
}

/**
 * Build the initial `PlanetTerraformState` from the planet's current
 * physical parameters.  This is called once when the player first opens
 * the Terraform panel for a planet that has no stored state yet.
 */
export function getInitialTerraformState(planet: Planet): PlanetTerraformState {
  const h = planet.habitability;

  const magneticField: TerraformParamState = {
    progress: clamp(Math.round(h.magneticField * 100), 0, 100),
    lastDeliveryAt: null,
  };

  const atmosphere: TerraformParamState = {
    progress: clamp(Math.round(h.atmosphere * 100), 0, 100),
    lastDeliveryAt: null,
  };

  // `ozone` has no direct habitability factor; use the atmospheric flag.
  const ozone: TerraformParamState = {
    progress: planet.atmosphere?.hasOzone === true ? 80 : 0,
    lastDeliveryAt: null,
  };

  const temperature: TerraformParamState = {
    progress: clamp(Math.round(h.temperature * 100), 0, 100),
    lastDeliveryAt: null,
  };

  const pressure: TerraformParamState = {
    progress: planet.atmosphere != null
      ? pressureProgress(planet.atmosphere.surfacePressureAtm)
      : 0,
    lastDeliveryAt: null,
  };

  const water: TerraformParamState = {
    progress: clamp(Math.round(h.water * 100), 0, 100),
    lastDeliveryAt: null,
  };

  return {
    planetId: planet.id,
    params: { magneticField, atmosphere, ozone, temperature, pressure, water },
    completedAt: null,
  };
}

/**
 * Compute the resource cost to bring a single parameter from `currentProgress`
 * to 100% on the given planet.
 *
 * Cost = baseCost × sizeMult × difficultyMult × (100 - currentProgress) / 100
 *
 * `planet.terraformDifficulty` ranges 0..1; difficulty multiplier = 1 + difficulty.
 * All fractional values are ceil-rounded to avoid zero-cost slivers.
 */
export function computeParamRequirement(
  planet: Planet,
  paramId: TerraformParamId,
  currentProgress: number,
): ResourceCost {
  const baseCost = TF_BASE_COSTS[paramId];
  const sizeMult = TF_SIZE_MULT[planetSizeBucket(planet)];
  const difficultyMult = 1 + (planet.terraformDifficulty ?? 0);
  const remainingFraction = clamp((100 - currentProgress) / 100, 0, 1);

  const scale = sizeMult * difficultyMult * remainingFraction;
  const result: ResourceCost = {};

  if (baseCost.minerals)  result.minerals  = Math.ceil(baseCost.minerals  * scale);
  if (baseCost.volatiles) result.volatiles = Math.ceil(baseCost.volatiles * scale);
  if (baseCost.isotopes)  result.isotopes  = Math.ceil(baseCost.isotopes  * scale);
  if (baseCost.water)     result.water     = Math.ceil(baseCost.water     * scale);

  return result;
}

/**
 * Apply a resource delivery to a parameter, returning a new state object.
 *
 * Progress gain = (deliveredAmount / fullRequirementAmount) × 100, where
 * fullRequirementAmount is the total amount needed to go from 0 → 100 at the
 * current planet's difficulty and size (i.e. the cost for full progress).
 *
 * This means partial deliveries accumulate linearly — no step-function gates.
 * `deliveredResource` must match the primary resource key used by the param.
 */
export function applyDelivery(
  state: PlanetTerraformState,
  paramId: TerraformParamId,
  deliveredAmount: number,
  deliveredResource: keyof ResourceCost,
): PlanetTerraformState {
  const param = state.params[paramId];
  const baseCost = TF_BASE_COSTS[paramId];

  // Identify the full base amount for the delivered resource type.
  // If the resource is a secondary input (e.g. isotopes for `atmosphere`),
  // it still contributes proportionally to its own share of the base cost.
  const fullBase: number = (baseCost as Record<string, number | undefined>)[deliveredResource] ?? 0;

  let gainedProgress = 0;
  if (fullBase > 0) {
    gainedProgress = (deliveredAmount / fullBase) * 100;
  }

  const newProgress = clamp(param.progress + gainedProgress, 0, 100);

  return {
    ...state,
    params: {
      ...state.params,
      [paramId]: {
        progress: Math.round(newProgress * 100) / 100,
        lastDeliveryAt: Date.now(),
      } satisfies TerraformParamState,
    },
  };
}

/** Average progress across all 6 parameters, 0..100. */
export function getOverallProgress(state: PlanetTerraformState): number {
  const ids: TerraformParamId[] = ['magneticField', 'atmosphere', 'ozone', 'temperature', 'pressure', 'water'];
  const sum = ids.reduce((acc, id) => acc + state.params[id].progress, 0);
  return Math.round((sum / ids.length) * 100) / 100;
}

/**
 * Check whether the player is allowed to start working on a given parameter.
 *
 * Gates (in evaluation order):
 * 1. Ковчег Генезису (`genesis_vault`) must be built on a colony — checked via
 *    the `hasGenesisVault` boolean passed in by the caller (surface state query).
 * 2. Tech tree requirements per param.
 * 3. Inter-param dependency thresholds (temperature requires magneticField +
 *    atmosphere both ≥ 50; pressure requires atmosphere ≥ 50).
 */
export function canStartParam(
  state: PlanetTerraformState,
  paramId: TerraformParamId,
  hasGenesisVault: boolean,
  planet: Planet,
  techState: TechTreeState,
): { allowed: boolean; reason?: string } {
  if (!hasGenesisVault) {
    return { allowed: false, reason: 'genesis_vault_required' };
  }

  if (!isTerraformable(planet)) {
    return { allowed: false, reason: 'planet_not_terraformable' };
  }

  // Tech gates
  const magneticsResearched = Boolean(techState.researched['phy-magnetics']);
  const bioTerraformingResearched = Boolean(techState.researched['bio-terraforming']);

  if (paramId === 'magneticField' && !magneticsResearched) {
    return { allowed: false, reason: 'tech_required:phy-magnetics' };
  }

  if (
    (paramId === 'atmosphere' || paramId === 'ozone' || paramId === 'temperature') &&
    !bioTerraformingResearched
  ) {
    return { allowed: false, reason: 'tech_required:bio-terraforming' };
  }

  // Inter-param dependencies
  if (paramId === 'temperature') {
    const mf = state.params.magneticField.progress;
    const atm = state.params.atmosphere.progress;
    if (mf < 50 || atm < 50) {
      return { allowed: false, reason: 'requires_magnetic_and_atmosphere_50' };
    }
  }

  if (paramId === 'pressure') {
    if (state.params.atmosphere.progress < 50) {
      return { allowed: false, reason: 'requires_atmosphere_50' };
    }
  }

  return { allowed: true };
}

/**
 * If the overall progress has reached the completion threshold and
 * `completedAt` is still null, return a new Planet with updated properties
 * (type promotion, per-factor habitability recompute, difficulty reset).
 *
 * Per-factor recompute (Phase 7C):
 *   temperature   += (progress/100) × 0.6
 *   atmosphere    += (progress/100) × 0.7
 *   water         += (progress/100) × 0.6
 *   magneticField += (progress/100) × 0.8
 *   gravity         unchanged (not terraformable)
 *
 * Overall is recomputed from the weighted formula (same weights as
 * calculateHabitability): temperature 0.30, atmosphere 0.25,
 * water 0.25, magneticField 0.10, gravity 0.10.
 *
 * Returns null when the planet is not yet complete or was already processed.
 */
export function applyTerraformCompletionToPlanet(
  planet: Planet,
  state: PlanetTerraformState,
): Planet | null {
  if (state.completedAt !== null) return null;
  if (getOverallProgress(state) < TF_COMPLETION_THRESHOLD) return null;

  const base = planet.habitability;
  const p = state.params;

  const temperature   = clamp(base.temperature   + (p.temperature.progress   / 100) * 0.6, 0, 1);
  const atmosphere    = clamp(base.atmosphere    + (p.atmosphere.progress    / 100) * 0.7, 0, 1);
  const water         = clamp(base.water         + (p.water.progress         / 100) * 0.6, 0, 1);
  const magneticField = clamp(base.magneticField + (p.magneticField.progress / 100) * 0.8, 0, 1);
  const gravity       = base.gravity; // not terraformable

  const overall = round4(
    temperature * 0.30 +
    atmosphere  * 0.25 +
    water       * 0.25 +
    magneticField * 0.10 +
    gravity     * 0.10,
  );

  // Rocky promotes to terrestrial; dwarf and terrestrial keep their type.
  const newType: Planet['type'] = planet.type === 'rocky' ? 'terrestrial' : planet.type;

  return {
    ...planet,
    type: newType,
    terraformDifficulty: 0,
    habitability: {
      ...base,
      temperature:   round4(temperature),
      atmosphere:    round4(atmosphere),
      water:         round4(water),
      magneticField: round4(magneticField),
      gravity:       round4(gravity),
      overall,
    },
  };
}

function round4(n: number): number { return Math.round(n * 10000) / 10000; }
