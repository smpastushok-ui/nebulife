// ---------------------------------------------------------------------------
// Civilizations — sentient life on core-zone planets (NEXT_GEN_PLAN §B, MVP)
//
// Framing: this is NOT "conquest". A civilization is integrated into the
// Stellar Community ("інтеграція в Зоряну Спільноту") through one of three
// paths. Only the diplomacy path is implemented in this MVP; siege and
// infiltration are typed now so later phases can slot in without reshaping
// this file.
// ---------------------------------------------------------------------------

/** Technological era of a civilization, oldest to newest. */
export type TechEra = 'stone' | 'agrarian' | 'industrial' | 'orbital';

/** Temperament gates which integration paths are realistically available. */
export type Temperament = 'peaceful' | 'wary' | 'hostile';

/**
 * A sentient civilization living on a planet. Always derived deterministically
 * from `planetSeed` — never persisted. Call `generateCivilization()` again
 * any time the same result is needed (planet inspection, mission report,
 * civilization card, etc.) instead of caching it in game state.
 */
export interface Civilization {
  id: string;
  planetId: string;
  planetSeed: number;
  techEra: TechEra;
  /** Population count (flavor + workforce sizing), not stored per-capita detail. */
  population: number;
  temperament: Temperament;
  /** Seed for future aesthetic/image generation (settlements, portraits, etc.) */
  aestheticSeed: number;
}

/** Ways a civilization can be integrated into the Stellar Community. */
export type IntegrationPath = 'diplomacy' | 'siege' | 'infiltration';

/**
 * Phase-3 seam: the orbital-siege combat engine (rebuilt by a concurrent
 * agent, see NEXT_GEN_PLAN §A) will populate/consume this once implemented.
 * MVP only defines the shape so civilization UI can render a typed "locked"
 * state for the siege path without guessing at the future combat engine's
 * data. Do not implement siege logic against this type in this MVP.
 */
export interface SiegeIntegrationHook {
  integrationPath: 'siege';
  status: 'not_implemented';
  /** Phase 3: whether an orbital blockade is currently active on this planet. */
  blockadeActive?: boolean;
  /** Phase 3: trust penalty applied the moment a blockade/siege begins. */
  startingTrustPenalty?: number;
}

/** Aggressive actions that damage trust. Only a subset is reachable in MVP
 *  (diplomacy has no aggressive actions of its own); the rest are the seam
 *  phase 3 (siege) and a later infiltration pass will trigger. */
export type AggressiveActionType =
  | 'orbital_blockade'
  | 'orbital_strike'
  | 'infiltration_sabotage';

/** The 0-100 relationship scale plus unrest/strike bookkeeping. */
export interface TrustState {
  /** 0-100. */
  value: number;
  strikeActive: boolean;
  strikeStartedAt?: number;
  strikeEndsAt?: number;
  lastStrikeEndedAt?: number;
  lastAggressiveAction?: AggressiveActionType;
  lastAggressiveActionAt?: number;
}

/** Sequential diplomacy mission stages (Academy-style timed interactions). */
export type ContactStageId = 'first_contact' | 'language_exchange' | 'alliance';

export type ContactStageStatus = 'pending' | 'active' | 'completed';

export interface ContactStageState {
  stageId: ContactStageId;
  status: ContactStageStatus;
  startedAt?: number;
  completedAt?: number;
}

/**
 * Player-side progress for one planet's civilization. This is the ONLY
 * civilization-related data that gets persisted (in `game_state` JSONB,
 * mirroring the terraform/colony pattern) — the `Civilization` itself is
 * always re-derived from the planet seed.
 */
export interface CivilizationContactState {
  civilizationId: string;
  /** `${systemId}::${planetId}` — matches the existing planetObjectKey scoping. */
  planetKey: string;
  trust: TrustState;
  stages: ContactStageState[];
  activeStageId: ContactStageId | null;
  integrationPath: IntegrationPath | null;
  integratedAt: number | null;
}
