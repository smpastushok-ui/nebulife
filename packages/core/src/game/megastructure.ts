// ---------------------------------------------------------------------------
// Megastructures — "Мегаструктури кластера"
// ---------------------------------------------------------------------------
// A collective, weeks-long construction project shared by all 50 players of
// a cluster. See GAME_MODULES.md (Соціальне та спільнота, "Мегаструктури
// кластера"). MVP type is the "Галактичний маяк" (Galactic Beacon) — a
// lore-friendly science structure (no weapons), tier 1.
//
// Pure sizing/clamp/payout math lives here so the client's optimistic preview
// and the server (source of truth, see packages/server/src/db.ts) agree —
// same split as creature-evolution.ts.
// ---------------------------------------------------------------------------

export type MegastructureType = 'beacon';
export type MegastructureStatus = 'building' | 'completed';

export interface MegastructureResourceBundle {
  minerals: number;
  volatiles: number;
  isotopes: number;
  water: number;
}

export const MEGASTRUCTURE_RESOURCE_KEYS: readonly (keyof MegastructureResourceBundle)[] =
  ['minerals', 'volatiles', 'isotopes', 'water'];

export function emptyResourceBundle(): MegastructureResourceBundle {
  return { minerals: 0, volatiles: 0, isotopes: 0, water: 0 };
}

export function resourceTotal(bundle: MegastructureResourceBundle): number {
  return MEGASTRUCTURE_RESOURCE_KEYS.reduce((sum, key) => sum + Math.max(0, bundle[key] || 0), 0);
}

/**
 * Requirement totals by (type, tier). Only "beacon" tier 1 is buildable in
 * this MVP; `tier` is kept open-ended so a future tier-2 structure can slot
 * in without a schema change.
 *
 * Sizing math (see final report for the full derivation):
 *
 *   target total = players(50) x days(25) x dailyCap(500) x utilization(40%)
 *                 = 50 x 25 x 500 x 0.40 = 250,000 units
 *
 * Split across the 4 resources using the same relative weighting as the
 * original design brief (minerals-heavy, isotopes scarcest), scaled down by
 * ~0.4x to land on the 250k target, then rounded to clean numbers:
 *
 *   minerals  120,000  (was 300,000 x 0.397)
 *   volatiles  60,000  (was 150,000 x 0.397)
 *   isotopes   32,000  (was  80,000 x 0.397)
 *   water      40,000  (was 100,000 x 0.397)
 *   ------------------
 *   total     252,000  -> ~25.2 cluster-days at full 50-player/40%-cap pace,
 *                          i.e. ~3.6 weeks.
 */
export const MEGASTRUCTURE_REQUIREMENTS: Record<MegastructureType, Record<number, MegastructureResourceBundle>> = {
  beacon: {
    1: { minerals: 120_000, volatiles: 60_000, isotopes: 32_000, water: 40_000 },
  },
};

export function getMegastructureRequirements(type: MegastructureType, tier: number): MegastructureResourceBundle {
  return MEGASTRUCTURE_REQUIREMENTS[type]?.[tier] ?? emptyResourceBundle();
}

/** Total raw resource units a single player may contribute per UTC day
 *  (summed across all 4 resource types), server-enforced. */
export const MEGASTRUCTURE_DAILY_CAP = 500;

/** Quark pool split among contributors on completion (per structure). */
export const MEGASTRUCTURE_COMPLETION_POOL_QUARKS = 2000;
/** XP pool split the same way as the quark pool on completion. */
export const MEGASTRUCTURE_COMPLETION_POOL_XP = 6000;
/** Minimum quark payout for anyone who contributed on at least this many
 *  distinct days (rewards showing up, not just raw volume). */
export const MEGASTRUCTURE_MIN_PAYOUT_QUARKS = 5;
export const MEGASTRUCTURE_MIN_PAYOUT_DAYS = 3;

/** Permanent passive bonus granted to the whole cluster on completion: research
 *  session duration multiplier (lower = faster), stacked multiplicatively with
 *  the tech-tree `research_speed_mult` effect. See App.tsx wiring. */
export const MEGASTRUCTURE_RESEARCH_SPEED_MULT = 0.95; // -5% duration = +5% speed

/**
 * Clamp a requested contribution against (a) how much of each resource the
 * structure still needs and (b) the player's remaining daily cap — applied
 * resource-by-resource in canonical order (minerals -> volatiles -> isotopes
 * -> water) so results are deterministic and easy to reason about. Never
 * returns negative or fractional amounts.
 */
export function clampContribution(
  requested: Partial<MegastructureResourceBundle>,
  progress: MegastructureResourceBundle,
  requirements: MegastructureResourceBundle,
  alreadyContributedTodayTotal: number,
): MegastructureResourceBundle {
  let capBudget = Math.max(0, MEGASTRUCTURE_DAILY_CAP - alreadyContributedTodayTotal);
  const applied = emptyResourceBundle();
  for (const key of MEGASTRUCTURE_RESOURCE_KEYS) {
    const want = Math.max(0, Math.floor(requested[key] ?? 0));
    const remainingNeed = Math.max(0, requirements[key] - progress[key]);
    const allowed = Math.min(want, remainingNeed, capBudget);
    applied[key] = allowed;
    capBudget -= allowed;
  }
  return applied;
}

export function progressPercent(
  progress: MegastructureResourceBundle,
  requirements: MegastructureResourceBundle,
): number {
  const need = resourceTotal(requirements);
  if (need <= 0) return 1;
  return Math.min(1, resourceTotal(progress) / need);
}

export function isMegastructureComplete(
  progress: MegastructureResourceBundle,
  requirements: MegastructureResourceBundle,
): boolean {
  return MEGASTRUCTURE_RESOURCE_KEYS.every((key) => progress[key] >= requirements[key]);
}

// ── Completion payout ───────────────────────────────────────────────────────

export interface MegastructureContributorStat {
  playerId: string;
  playerName: string;
  totalUnits: number;
  days: number;
}

export interface MegastructureBuilderRecord extends MegastructureContributorStat {
  /** Fraction (0..1) of all contributed units. */
  share: number;
  quarksAwarded: number;
  xpAwarded: number;
}

/**
 * Splits the completion pools proportionally by total contributed units.
 * Quarks additionally guarantee a floor (`MEGASTRUCTURE_MIN_PAYOUT_QUARKS`)
 * for anyone who contributed on `MEGASTRUCTURE_MIN_PAYOUT_DAYS`+ distinct
 * days — proportional shares already sum to ~pool (rounding only), so this
 * floor is the sole source of (small, bounded) pool overage, which is
 * acceptable for a non-monetary reward pool. Returned sorted by share desc
 * (leaderboard / "Будівничі" order).
 */
export function computeMegastructureBuilders(
  contributors: MegastructureContributorStat[],
  quarkPool = MEGASTRUCTURE_COMPLETION_POOL_QUARKS,
  xpPool = MEGASTRUCTURE_COMPLETION_POOL_XP,
): MegastructureBuilderRecord[] {
  const totalUnits = contributors.reduce((sum, c) => sum + c.totalUnits, 0);
  if (totalUnits <= 0) return [];

  const records = contributors.map((c) => {
    const share = c.totalUnits / totalUnits;
    const proportionalQuarks = Math.round(quarkPool * share);
    const eligibleForMin = c.days >= MEGASTRUCTURE_MIN_PAYOUT_DAYS;
    const quarksAwarded = eligibleForMin
      ? Math.max(proportionalQuarks, MEGASTRUCTURE_MIN_PAYOUT_QUARKS)
      : proportionalQuarks;
    const xpAwarded = Math.round(xpPool * share);
    return { ...c, share, quarksAwarded, xpAwarded };
  });

  return records.sort((a, b) => b.share - a.share);
}
