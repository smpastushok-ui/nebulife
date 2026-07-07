// ---------------------------------------------------------------------------
// Live cosmic events — recurring, time-limited observation windows
// ---------------------------------------------------------------------------
// Generalization of the "Comet Herald" pattern (see comet-event.ts): each
// event has a deterministic per-player schedule shared by client AND server.
// Both sides compute the same window from (eventId, playerId) alone, so the
// server can validate reward claims without storing any schedule.
//
// Every event cycles independently (staggered cycle lengths + a per-player,
// per-event hash offset), appears for every player, and is FREE to observe:
// the reward gallery art ships bundled with the client — no AI generation.
//
// Rewards are intentionally modest compared to the legendary Comet Herald:
// a small quark grant (server-credited) plus research data and XP
// (client-side, same trust model as the comet event).
// ---------------------------------------------------------------------------

import { cometHash, type CometSchedule } from './comet-event.js';

/** Schedule shape is identical to the comet's — reuse the type. */
export type LiveEventSchedule = CometSchedule;

export interface LiveEventDef {
  /** Stable id — also the eventOnly cosmic-catalog `type` of the reward entry. */
  id: string;
  /** Days between occurrences for a given player. */
  cycleDays: number;
  /** Server-credited quark grant. */
  rewardQuarks: number;
  /** Client-side research data grant. */
  rewardResearchData: number;
  /** Client-side XP grant. */
  rewardXp: number;
  /** Rarity of the granted gallery entry (matches the catalog entry). */
  rarity: 'epic';
  /** In-game tracking session length before the claim fires. */
  trackingDurationMs: number;
}

/** Where the bundled live-event art lives (client public folder). */
export const LIVE_EVENT_ASSET_BASE = '/cosmic-events/live';

/** Bundled art URL for a live event's gallery entry. */
export function liveEventPhotoUrl(eventId: string): string {
  return `${LIVE_EVENT_ASSET_BASE}/${eventId}.webp`;
}

/** Tracking session length shared by all live events (comet uses 30s). */
export const LIVE_EVENT_TRACKING_DURATION_MS = 20_000;

/**
 * The four live events. Cycle lengths are pairwise distinct (9/19/23/31)
 * so windows drift against each other and against the 14-day comet — most
 * days have nothing, some days align into a small "sky festival".
 */
export const LIVE_EVENTS: readonly LiveEventDef[] = [
  {
    // A starless planet drifts through the outskirts of the home system.
    id: 'rogue-flyby',
    cycleDays: 19,
    rewardQuarks: 8,
    rewardResearchData: 30,
    rewardXp: 80,
    rarity: 'epic',
    trackingDurationMs: LIVE_EVENT_TRACKING_DURATION_MS,
  },
  {
    // Light from an ancient supernova sweeps across nearby dust sheets.
    id: 'supernova-echo',
    cycleDays: 23,
    rewardQuarks: 10,
    rewardResearchData: 40,
    rewardXp: 90,
    rarity: 'epic',
    trackingDurationMs: LIVE_EVENT_TRACKING_DURATION_MS,
  },
  {
    // An 'Oumuamua-class interstellar object transits the inner system.
    id: 'interstellar-visitor',
    cycleDays: 31,
    rewardQuarks: 10,
    rewardResearchData: 40,
    rewardXp: 90,
    rarity: 'epic',
    trackingDurationMs: LIVE_EVENT_TRACKING_DURATION_MS,
  },
  {
    // A flare from the home star drives planet-wide aurora storms.
    id: 'aurora-storm',
    cycleDays: 9,
    rewardQuarks: 6,
    rewardResearchData: 25,
    rewardXp: 60,
    rarity: 'epic',
    trackingDurationMs: LIVE_EVENT_TRACKING_DURATION_MS,
  },
] as const;

export function getLiveEventDef(eventId: string): LiveEventDef | undefined {
  return LIVE_EVENTS.find((e) => e.id === eventId);
}

/** Fixed epoch the cycles count from (2026-01-05 UTC — same as the comet). */
const LIVE_EVENT_EPOCH_UTC_MS = Date.UTC(2026, 0, 5);

const DAY_MS = 86_400_000;

function utcDateString(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Compute the current-or-next 24h window for (eventId, playerId).
 * Pure function of (eventId, playerId, now) — server validates claims with
 * the exact same call. Offset hashes BOTH ids so a player's different events
 * do not stack on the same day by construction.
 */
export function getLiveEventSchedule(
  eventId: string,
  playerId: string,
  now: number,
): LiveEventSchedule {
  const def = getLiveEventDef(eventId);
  const cycleDays = def?.cycleDays ?? 19;
  const offsetDays = cometHash(`${eventId}:${playerId}`) % cycleDays;
  const daysSinceEpoch = Math.floor((now - LIVE_EVENT_EPOCH_UTC_MS) / DAY_MS);

  // Most recent cycle day at-or-before today.
  const into = ((daysSinceEpoch - offsetDays) % cycleDays + cycleDays) % cycleDays;
  const lastDay = daysSinceEpoch - into;

  const lastStart = LIVE_EVENT_EPOCH_UTC_MS + lastDay * DAY_MS;
  const lastEnd = lastStart + DAY_MS;

  if (now < lastEnd) {
    return {
      occurrenceDate: utcDateString(lastStart),
      windowStartMs: lastStart,
      windowEndMs: lastEnd,
      active: now >= lastStart,
      msUntilWindow: Math.max(0, lastStart - now),
      msUntilWindowEnd: Math.max(0, lastEnd - now),
    };
  }

  const nextStart = lastStart + cycleDays * DAY_MS;
  return {
    occurrenceDate: utcDateString(nextStart),
    windowStartMs: nextStart,
    windowEndMs: nextStart + DAY_MS,
    active: false,
    msUntilWindow: nextStart - now,
    msUntilWindowEnd: nextStart + DAY_MS - now,
  };
}

/** All live events with their current schedules — client convenience. */
export function getAllLiveEventSchedules(
  playerId: string,
  now: number,
): Array<{ def: LiveEventDef; schedule: LiveEventSchedule }> {
  return LIVE_EVENTS.map((def) => ({
    def,
    schedule: getLiveEventSchedule(def.id, playerId, now),
  }));
}

/** Idempotency / claim key for a specific occurrence of a specific event. */
export function liveEventClaimKey(
  eventId: string,
  playerId: string,
  occurrenceDate: string,
): string {
  return `live:${eventId}:${playerId}:${occurrenceDate}`;
}
