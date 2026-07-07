// ---------------------------------------------------------------------------
// "Сигнали Предтеч" (Precursor Signals) — collectible card manifest + drop
// roll. Cards drop from completed planet research missions
// (`planet-exploration.ts` → `completePlanetMission`). See GAME_MODULES.md.
//
// Rarity vocabulary mirrors `discovery.ts` (`DiscoveryRarity`): this module
// mirrors the SAME relative rarity weighting, folding `uncommon` into
// `common` since the 14-card manifest only needs 4 tiers:
//   discovery.ts RARITY_WEIGHTS: common 80, uncommon 10, rare 5, epic 3, legendary 2
//   → precursor:                  common 90 (80+10), rare 5, epic 3, legendary 2
// ---------------------------------------------------------------------------

import type { PlanetMissionType } from '../types/planet-exploration.js';
import type { PrecursorCardDef, PrecursorRarity } from '../types/precursor-cards.js';

export const PRECURSOR_CARDS: PrecursorCardDef[] = [
  // Legendary — core-only, extends lategame.
  { id: 'signal-origin', rarity: 'legendary', coreOnly: true },
  { id: 'signal-weaver', rarity: 'legendary', coreOnly: true },
  // Epic — 2 of 3 core-only.
  { id: 'signal-engine', rarity: 'epic', coreOnly: true },
  { id: 'signal-archive', rarity: 'epic', coreOnly: true },
  { id: 'signal-gate', rarity: 'epic', coreOnly: false },
  // Rare
  { id: 'signal-lattice', rarity: 'rare', coreOnly: false },
  { id: 'signal-helix', rarity: 'rare', coreOnly: false },
  { id: 'signal-mirror', rarity: 'rare', coreOnly: false },
  { id: 'signal-beacon', rarity: 'rare', coreOnly: false },
  // Common
  { id: 'signal-echo', rarity: 'common', coreOnly: false },
  { id: 'signal-pulse', rarity: 'common', coreOnly: false },
  { id: 'signal-dust', rarity: 'common', coreOnly: false },
  { id: 'signal-ice', rarity: 'common', coreOnly: false },
  { id: 'signal-drift', rarity: 'common', coreOnly: false },
];

export const PRECURSOR_CARD_TOTAL = PRECURSOR_CARDS.length; // 14

export function getPrecursorCardDef(id: string): PrecursorCardDef | undefined {
  return PRECURSOR_CARDS.find((c) => c.id === id);
}

/** Mirrors `discovery.ts` RARITY_WEIGHTS with `uncommon` folded into `common`. */
export const PRECURSOR_RARITY_WEIGHTS: Record<PrecursorRarity, number> = {
  common: 90,
  rare: 5,
  epic: 3,
  legendary: 2,
};

/** Base per-mission drop chance (GAME_MODULES.md spec), tuned per mission type. */
export const PRECURSOR_DROP_CHANCE_DEFAULT = 0.15;
export const PRECURSOR_DROP_CHANCE_BY_MISSION: Partial<Record<PlanetMissionType, number>> = {
  deep_atmosphere_probe: 0.20,
  orbital_scan: 0.10,
};

export function getPrecursorDropChance(missionType: PlanetMissionType): number {
  return PRECURSOR_DROP_CHANCE_BY_MISSION[missionType] ?? PRECURSOR_DROP_CHANCE_DEFAULT;
}

export interface PrecursorDropResult {
  /** Set when a new (or re-rolled) card was awarded. */
  cardId: string | null;
  rarity: PrecursorRarity;
  /** True when every card in the rolled rarity tier (within the allowed pool) was already owned. */
  allOwnedInRarity: boolean;
  /** +2⚛ consolation, only set when `allOwnedInRarity` is true. */
  consolationQuarks: number;
}

/**
 * Roll for a precursor card drop after a planet mission completes.
 *
 * Flow: chance gate (per mission type) → rarity roll (weighted) → pick a
 * card of that rarity from the allowed pool (core-only cards excluded
 * unless `isCoreZone`) → prefer an unowned card ("re-roll once ... toward
 * unowned"); if every card in that rarity/pool is already owned, grant the
 * +2⚛ consolation instead of a duplicate.
 *
 * Not deterministic (uses `Math.random()`, same as other client reward
 * rolls in this codebase, e.g. `logistics.ts` / `production.ts`) — the spec
 * explicitly does not require determinism for this reward roll.
 */
export function rollPrecursorCardDrop(params: {
  missionType: PlanetMissionType;
  isCoreZone: boolean;
  ownedCardIds: ReadonlySet<string> | ReadonlyArray<string>;
}): PrecursorDropResult | null {
  const dropChance = getPrecursorDropChance(params.missionType);
  if (Math.random() > dropChance) return null;

  const owned = params.ownedCardIds instanceof Set ? params.ownedCardIds : new Set(params.ownedCardIds);

  const totalWeight = Object.values(PRECURSOR_RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;
  let rarity: PrecursorRarity = 'common';
  for (const [r, w] of Object.entries(PRECURSOR_RARITY_WEIGHTS) as [PrecursorRarity, number][]) {
    roll -= w;
    if (roll <= 0) { rarity = r; break; }
  }

  const zoneFilter = (c: PrecursorCardDef) => params.isCoreZone || !c.coreOnly;
  let pool = PRECURSOR_CARDS.filter((c) => c.rarity === rarity && zoneFilter(c));
  // Fallback: some rarities (e.g. legendary) are entirely core-only — outside
  // the core zone, widen the pool to every zone-legal card so a drop chance
  // roll never fizzles into nothing.
  if (pool.length === 0) pool = PRECURSOR_CARDS.filter(zoneFilter);
  if (pool.length === 0) return null;

  const unowned = pool.filter((c) => !owned.has(c.id));
  if (unowned.length > 0) {
    const chosen = unowned[Math.floor(Math.random() * unowned.length)];
    return { cardId: chosen.id, rarity: chosen.rarity, allOwnedInRarity: false, consolationQuarks: 0 };
  }

  // Every card in the rolled rarity/pool is already owned — consolation.
  return { cardId: null, rarity, allOwnedInRarity: true, consolationQuarks: 2 };
}

export function isPrecursorCollectionComplete(ownedCardIds: ReadonlySet<string> | ReadonlyArray<string>): boolean {
  const owned = ownedCardIds instanceof Set ? ownedCardIds : new Set(ownedCardIds);
  return PRECURSOR_CARDS.every((c) => owned.has(c.id));
}

/** Client-side one-time completion reward (no server table for this collection — see GAME_MODULES.md). */
export const PRECURSOR_COMPLETION_REWARD_QUARKS = 100;
