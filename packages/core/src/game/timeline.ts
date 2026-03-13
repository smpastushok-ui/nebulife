import { ASTEROID_COUNTDOWN_SECONDS } from '../constants/game.js';

// ---------------------------------------------------------------------------
// Doomsday Clock — Game-time math
// ---------------------------------------------------------------------------
// Real 1 hour (3600s) = Game 24 hours (86400 game-seconds)
// BASE_TIME_MULTIPLIER = 24 (1 real second = 24 game seconds)
// timeMultiplier can be increased (e.g. to 48 after finding habitable planet)
// ---------------------------------------------------------------------------

/** Base time scale: 1 real second = 24 game seconds */
export const BASE_TIME_MULTIPLIER = 24;

/** Total game-seconds in the countdown (24 hours = 86400) */
export const GAME_TOTAL_SECONDS = 24 * 3600; // 86400

/** Calculate asteroid impact timestamp (real-time) */
export function calculateImpactTime(registeredAt: number): number {
  return registeredAt + ASTEROID_COUNTDOWN_SECONDS * 1000;
}

/** Get remaining REAL time in milliseconds */
export function remainingTimeMs(impactAt: number, now: number = Date.now()): number {
  return Math.max(0, impactAt - now);
}

/**
 * Calculate remaining GAME time from elapsed real time.
 *
 * Uses a snapshot approach: stores the moment when the multiplier changed
 * and how much game-time had already been consumed by that point.
 *
 * @param startedAt     - real timestamp when game started (ms)
 * @param now           - current real timestamp (ms)
 * @param multiplier    - current time multiplier (BASE_TIME_MULTIPLIER * speed factor)
 * @param accelAt       - real timestamp when the multiplier was changed (ms), or null
 * @param gameTimeAtAccel - game-seconds already consumed at the moment of acceleration
 * @returns remaining game-seconds (can be fractional for fast-ticking display)
 */
export function remainingGameSeconds(
  startedAt: number,
  now: number,
  multiplier: number,
  accelAt: number | null,
  gameTimeAtAccel: number,
): number {
  if (accelAt !== null && now >= accelAt) {
    // Two phases: before accel (at base rate) + after accel (at new rate)
    const realSecsSinceAccel = (now - accelAt) / 1000;
    const gameSecsSinceAccel = realSecsSinceAccel * multiplier;
    const totalGameSecsElapsed = gameTimeAtAccel + gameSecsSinceAccel;
    return Math.max(0, GAME_TOTAL_SECONDS - totalGameSecsElapsed);
  }
  // Single phase: base rate only
  const realSecsElapsed = (now - startedAt) / 1000;
  const gameSecsElapsed = realSecsElapsed * multiplier;
  return Math.max(0, GAME_TOTAL_SECONDS - gameSecsElapsed);
}

/**
 * Format game-seconds into HH:MM:SS.
 * Game seconds tick 24x (or more) faster than real seconds,
 * creating a frantic visual effect.
 */
export function formatGameTime(gameSecsRemaining: number): {
  hours: number;
  minutes: number;
  seconds: number;
  totalGameSeconds: number;
  isExpired: boolean;
  /** Formatted string "HH:MM:SS" */
  text: string;
} {
  const total = Math.max(0, Math.floor(gameSecsRemaining));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return {
    hours,
    minutes,
    seconds,
    totalGameSeconds: total,
    isExpired: total === 0,
    text: `${hh}:${mm}:${ss}`,
  };
}

/** Get remaining time as human-readable components (LEGACY — real-time based) */
export function remainingTimeFormatted(impactAt: number, now: number = Date.now()): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
} {
  const totalMs = remainingTimeMs(impactAt, now);
  const totalSeconds = Math.floor(totalMs / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
    isExpired: totalMs === 0,
  };
}

/** Check if the planet has been destroyed (game-time based) */
export function isPlanetDestroyed(impactAt: number, now: number = Date.now()): boolean {
  return now >= impactAt;
}

/**
 * Calculate the game-seconds already consumed at a given real timestamp.
 * Used when snapshotting the moment of acceleration.
 */
export function gameSecondsElapsed(
  startedAt: number,
  at: number,
  multiplier: number,
): number {
  const realSecs = (at - startedAt) / 1000;
  return realSecs * multiplier;
}
