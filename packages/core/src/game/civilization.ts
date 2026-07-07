// ---------------------------------------------------------------------------
// Civilization diplomacy — contact stages, trust scale, workforce multiplier,
// unrest/strike events (NEXT_GEN_PLAN §B, phases 1-2 MVP).
//
// Only the diplomacy integration path is implemented here. Siege
// (orbital-blockade demonstration of force) is a phase-3 seam — see
// `SiegeIntegrationHook` in `types/civilization.ts` — and infiltration is
// left for a later pass. Both are represented in `IntegrationPath` /
// `getIntegrationPathAvailability()` so the UI can render locked states now.
// ---------------------------------------------------------------------------

import { XP_REWARDS } from '../constants/progression.js';
import { getCivilizationPopulationFactor } from '../generation/civilization-generator.js';
import type { TechTreeState } from './tech-tree.js';
import { getEffectValue } from './tech-tree.js';
import type {
  AggressiveActionType,
  Civilization,
  CivilizationContactState,
  ContactStageId,
  ContactStageState,
  IntegrationPath,
  Temperament,
  TrustState,
} from '../types/civilization.js';

// ── Gating ───────────────────────────────────────────────────────────────

/** Minimum player level to begin any civilization contact (NEXT_GEN_PLAN §B). */
export const XENO_DIPLOMACY_MIN_LEVEL = 20;

/** Whether the player has unlocked civilization contact at all (level + tech). */
export function hasXenoDiplomacyUnlocked(playerLevel: number, techState: TechTreeState): boolean {
  return playerLevel >= XENO_DIPLOMACY_MIN_LEVEL && getEffectValue(techState, 'xeno_diplomacy_unlock') > 0;
}

/**
 * Availability of each integration path for a given civilization. `siege`
 * and `infiltration` are always `available: false` in this MVP — siege is
 * the phase-3 seam (combat engine not ready), infiltration is out of scope
 * for phases 1-2. Both still carry a `reasonKey` so the UI can render a
 * "потрібні технології" / "згодом" locked state instead of hiding the path.
 */
export function getIntegrationPathAvailability(
  civ: Civilization,
  playerLevel: number,
  techState: TechTreeState,
): Record<IntegrationPath, { available: boolean; reasonKey: string | null }> {
  const unlocked = hasXenoDiplomacyUnlocked(playerLevel, techState);
  const diplomacyBlockedByTemperament = civ.temperament === 'hostile';
  return {
    diplomacy: unlocked && !diplomacyBlockedByTemperament
      ? { available: true, reasonKey: null }
      : {
          available: false,
          reasonKey: diplomacyBlockedByTemperament
            ? 'civilization.path_reason.hostile_temperament'
            : 'civilization.path_reason.tech_required',
        },
    // Phase 3 seam — orbital siege via the combat engine rebuild (NEXT_GEN_PLAN §A).
    siege: { available: false, reasonKey: 'civilization.path_reason.tech_required' },
    // Out of scope for phases 1-2.
    infiltration: { available: false, reasonKey: 'civilization.path_reason.later' },
  };
}

// ── Contact stages ───────────────────────────────────────────────────────

export const CONTACT_STAGE_ORDER: ContactStageId[] = ['first_contact', 'language_exchange', 'alliance'];

/** Timed interaction durations, mirroring the scale of `orbital_scan` /
 *  `orbital_probe` planet-mission phases (tens of seconds to ~2 minutes). */
export const CONTACT_STAGE_DURATION_MS: Record<ContactStageId, number> = {
  first_contact: 45_000,
  language_exchange: 75_000,
  alliance: 110_000,
};

/** Trust gained on stage completion. Sums to 90 — leaves headroom to 100
 *  for future goodwill actions beyond the MVP three-stage series. */
export const CONTACT_STAGE_TRUST_REWARD: Record<ContactStageId, number> = {
  first_contact: 25,
  language_exchange: 30,
  alliance: 35,
};

export const CONTACT_STAGE_XP_REWARD: Record<ContactStageId, number> = {
  first_contact: XP_REWARDS.CIVILIZATION_FIRST_CONTACT,
  language_exchange: XP_REWARDS.CIVILIZATION_LANGUAGE_EXCHANGE,
  alliance: XP_REWARDS.CIVILIZATION_ALLIANCE,
};

export function createTrustState(): TrustState {
  return { value: 0, strikeActive: false };
}

export function createCivilizationContactState(civilizationId: string, planetKey: string): CivilizationContactState {
  return {
    civilizationId,
    planetKey,
    trust: createTrustState(),
    stages: CONTACT_STAGE_ORDER.map((stageId) => ({ stageId, status: 'pending' as const })),
    activeStageId: null,
    integrationPath: null,
    integratedAt: null,
  };
}

function getStage(state: CivilizationContactState, stageId: ContactStageId): ContactStageState | undefined {
  return state.stages.find((s) => s.stageId === stageId);
}

/** Whether all three contact stages are completed (= civilization integrated). */
export function isCivilizationIntegrated(state: CivilizationContactState): boolean {
  return CONTACT_STAGE_ORDER.every((id) => getStage(state, id)?.status === 'completed');
}

/** The next stage the player can start, or null if all are done/in-progress. */
export function getNextContactStage(state: CivilizationContactState): ContactStageId | null {
  for (const stageId of CONTACT_STAGE_ORDER) {
    const stage = getStage(state, stageId);
    if (!stage || stage.status === 'pending') return stageId;
    if (stage.status === 'active') return null; // already busy
  }
  return null;
}

export type ContactStageBlockReason =
  | 'diplomacy_locked'
  | 'temperament_hostile'
  | 'already_integrated'
  | 'stage_active'
  | 'out_of_order';

export function canStartContactStage(params: {
  state: CivilizationContactState;
  civ: Civilization;
  stageId: ContactStageId;
  playerLevel: number;
  techState: TechTreeState;
}): { canStart: boolean; reason?: ContactStageBlockReason } {
  const { state, civ, stageId, playerLevel, techState } = params;
  if (isCivilizationIntegrated(state)) return { canStart: false, reason: 'already_integrated' };
  if (!hasXenoDiplomacyUnlocked(playerLevel, techState)) return { canStart: false, reason: 'diplomacy_locked' };
  if (civ.temperament === 'hostile') return { canStart: false, reason: 'temperament_hostile' };
  if (state.activeStageId) return { canStart: false, reason: 'stage_active' };
  if (getNextContactStage(state) !== stageId) return { canStart: false, reason: 'out_of_order' };
  return { canStart: true };
}

export function startContactStage(state: CivilizationContactState, stageId: ContactStageId, now: number): CivilizationContactState {
  return {
    ...state,
    activeStageId: stageId,
    stages: state.stages.map((s) => (s.stageId === stageId ? { ...s, status: 'active', startedAt: now } : s)),
  };
}

export interface ContactStageProgress {
  stageId: ContactStageId;
  progress: number; // 0-1
  remainingMs: number;
  ready: boolean;
}

export function getContactStageProgress(state: CivilizationContactState, now: number): ContactStageProgress | null {
  if (!state.activeStageId) return null;
  const stage = getStage(state, state.activeStageId);
  if (!stage || stage.status !== 'active' || stage.startedAt === undefined) return null;
  const duration = CONTACT_STAGE_DURATION_MS[stage.stageId];
  const elapsed = Math.max(0, now - stage.startedAt);
  const progress = duration <= 0 ? 1 : Math.min(1, elapsed / duration);
  return {
    stageId: stage.stageId,
    progress,
    remainingMs: Math.max(0, duration - elapsed),
    ready: progress >= 1,
  };
}

/** Complete the active stage: raises trust, and if it was the last stage,
 *  marks the civilization integrated with the diplomacy path. Caller is
 *  responsible for awarding `CONTACT_STAGE_XP_REWARD[stageId]` XP. */
export function completeContactStage(state: CivilizationContactState, now: number): CivilizationContactState {
  const stageId = state.activeStageId;
  if (!stageId) return state;
  const reward = CONTACT_STAGE_TRUST_REWARD[stageId];
  const nextStages = state.stages.map((s) => (s.stageId === stageId ? { ...s, status: 'completed' as const, completedAt: now } : s));
  const nextTrust: TrustState = { ...state.trust, value: Math.min(100, state.trust.value + reward) };
  const allDone = CONTACT_STAGE_ORDER.every((id) => nextStages.find((s) => s.stageId === id)?.status === 'completed');
  return {
    ...state,
    stages: nextStages,
    trust: nextTrust,
    activeStageId: null,
    integrationPath: allDone ? 'diplomacy' : state.integrationPath,
    integratedAt: allDone ? now : state.integratedAt,
  };
}

// ── Trust deltas from aggressive actions (phase-3 / infiltration seam) ────

/** Trust lost per aggressive action. Diplomacy itself never triggers these —
 *  they exist so phase 3 (siege) and a later infiltration pass have a ready
 *  contract to call `applyAggressiveAction()` against. */
export const AGGRESSIVE_ACTION_TRUST_PENALTY: Record<AggressiveActionType, number> = {
  orbital_blockade: 25,
  orbital_strike: 40,
  infiltration_sabotage: 15,
};

export function applyAggressiveAction(trust: TrustState, action: AggressiveActionType, now: number): TrustState {
  const penalty = AGGRESSIVE_ACTION_TRUST_PENALTY[action];
  return {
    ...trust,
    value: Math.max(0, trust.value - penalty),
    lastAggressiveAction: action,
    lastAggressiveActionAt: now,
  };
}

// ── Workforce production multiplier ───────────────────────────────────────

/** Cap for the trust-scaled production multiplier (NEXT_GEN_PLAN §B). */
export const WORKFORCE_MULTIPLIER_CAP = 1.5;

/**
 * `1.0 + population_factor * trust/100`, capped at 1.5x — matches the
 * NEXT_GEN_PLAN formula exactly. `population_factor` is derived from the
 * civilization's era-relative population size (0 to 0.5).
 */
export function getWorkforceProductionMultiplier(civ: Civilization, trustValue: number): number {
  const populationFactor = getCivilizationPopulationFactor(civ);
  const raw = 1.0 + populationFactor * (Math.max(0, Math.min(100, trustValue)) / 100);
  return Math.min(WORKFORCE_MULTIPLIER_CAP, raw);
}

// ── Unrest / strikes ───────────────────────────────────────────────────────

/** Below this trust value, the workforce risks striking. */
export const STRIKE_TRUST_THRESHOLD = 30;
/** How long a strike suppresses production once triggered. */
export const STRIKE_DURATION_MS = 20 * 60 * 1000;
/** Minimum time between strikes on the same planet. */
export const STRIKE_COOLDOWN_MS = 10 * 60 * 1000;
/** Production multiplier applied on top of the workforce multiplier while striking. */
export const STRIKE_PRODUCTION_MULTIPLIER = 0.5;

/**
 * Advance strike state for the current tick: ends an expired strike, or
 * starts a new one if trust is below threshold, no strike is active, and the
 * cooldown has elapsed. Deterministic given `(trust, now)` — call this from
 * a periodic client tick, same pattern as planet mission progress polling.
 */
export function tickTrustState(trust: TrustState, now: number): TrustState {
  if (trust.strikeActive) {
    if (trust.strikeEndsAt !== undefined && now >= trust.strikeEndsAt) {
      return { ...trust, strikeActive: false, strikeEndsAt: undefined, lastStrikeEndedAt: now };
    }
    return trust;
  }
  if (trust.value >= STRIKE_TRUST_THRESHOLD) return trust;
  if (trust.lastStrikeEndedAt !== undefined && now - trust.lastStrikeEndedAt < STRIKE_COOLDOWN_MS) return trust;
  return { ...trust, strikeActive: true, strikeStartedAt: now, strikeEndsAt: now + STRIKE_DURATION_MS };
}

/** Effective production multiplier including the strike penalty, if any. */
export function getEffectiveWorkforceMultiplier(civ: Civilization, trust: TrustState): number {
  const base = getWorkforceProductionMultiplier(civ, trust.value);
  return trust.strikeActive ? base * STRIKE_PRODUCTION_MULTIPLIER : base;
}

// ── Flavor helpers ─────────────────────────────────────────────────────────

export function getTemperamentFlavorKey(temperament: Temperament): string {
  return `civilization.temperament.${temperament}`;
}
