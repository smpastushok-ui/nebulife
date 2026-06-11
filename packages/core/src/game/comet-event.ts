// ---------------------------------------------------------------------------
// Comet Herald — recurring live event with a 24h observation window
// ---------------------------------------------------------------------------
// Deterministic per-player schedule shared by client AND server: both sides
// compute the same fly-by date from the player id alone, so the server can
// validate reward claims without storing a schedule.
//
// Cycle: every COMET_CYCLE_DAYS the comet passes the player's home system.
// The observation window is the full UTC day of the fly-by. The per-player
// offset (hash of playerId) staggers windows across the population so reward
// crons and pushes don't spike on a single day.
// ---------------------------------------------------------------------------

/** Days between comet fly-bys for a given player. */
export const COMET_CYCLE_DAYS = 14;

/** Rewards for completing the comet tracking during the window. */
export const COMET_REWARD_QUARKS = 20;
export const COMET_REWARD_XP = 150;
/** Substantial resource drop, added to the active colony per bucket. */
export const COMET_REWARD_RESOURCES = {
  minerals: 600,
  volatiles: 600,
  isotopes: 400,
  water: 600,
} as const;

/** Catalog type granted to the gallery on completion (legendary, event-only). */
export const COMET_CATALOG_TYPE = 'comet-herald';

/** Duration of the in-game tracking session before the reward can be claimed. */
export const COMET_TRACKING_DURATION_MS = 30_000;

/** Fixed epoch the cycle counts from (2026-01-05 UTC, a Monday). */
const COMET_EPOCH_UTC_MS = Date.UTC(2026, 0, 5);

const DAY_MS = 86_400_000;

/** Stable 32-bit FNV-1a hash — identical results in browser and Node. */
export function cometHash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface CometSchedule {
  /** YYYY-MM-DD (UTC) of the current-or-next fly-by day. */
  occurrenceDate: string;
  /** Window start (UTC midnight of the fly-by day), epoch ms. */
  windowStartMs: number;
  /** Window end (exclusive), epoch ms. */
  windowEndMs: number;
  /** True when `now` is inside the observation window. */
  active: boolean;
  /** ms until the window opens (0 when active or passed). */
  msUntilWindow: number;
  /** ms until the window closes (only meaningful when active). */
  msUntilWindowEnd: number;
}

function utcDateString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Compute the current-or-next comet window for a player.
 * Pure function of (playerId, now) — server validates claims with the same call.
 */
export function getCometSchedule(playerId: string, now: number): CometSchedule {
  const offsetDays = cometHash(playerId) % COMET_CYCLE_DAYS;
  const daysSinceEpoch = Math.floor((now - COMET_EPOCH_UTC_MS) / DAY_MS);

  // Most recent cycle day at-or-before today.
  const into = ((daysSinceEpoch - offsetDays) % COMET_CYCLE_DAYS + COMET_CYCLE_DAYS) % COMET_CYCLE_DAYS;
  const lastFlybyDay = daysSinceEpoch - into;

  const lastStart = COMET_EPOCH_UTC_MS + lastFlybyDay * DAY_MS;
  const lastEnd = lastStart + DAY_MS;

  if (now < lastEnd) {
    // Inside (or exactly at the start of) the current window day.
    return {
      occurrenceDate: utcDateString(lastStart),
      windowStartMs: lastStart,
      windowEndMs: lastEnd,
      active: now >= lastStart,
      msUntilWindow: Math.max(0, lastStart - now),
      msUntilWindowEnd: Math.max(0, lastEnd - now),
    };
  }

  const nextStart = lastStart + COMET_CYCLE_DAYS * DAY_MS;
  return {
    occurrenceDate: utcDateString(nextStart),
    windowStartMs: nextStart,
    windowEndMs: nextStart + DAY_MS,
    active: false,
    msUntilWindow: nextStart - now,
    msUntilWindowEnd: nextStart + DAY_MS - now,
  };
}

/** Idempotency / claim key for a specific occurrence. */
export function cometClaimKey(playerId: string, occurrenceDate: string): string {
  return `comet:${playerId}:${occurrenceDate}`;
}
