import { ASTEROID_COUNTDOWN_SECONDS } from '../constants/game.js';

/** Calculate asteroid impact timestamp */
export function calculateImpactTime(registeredAt: number): number {
  return registeredAt + ASTEROID_COUNTDOWN_SECONDS * 1000;
}

/** Get remaining time in milliseconds */
export function remainingTimeMs(impactAt: number, now: number = Date.now()): number {
  return Math.max(0, impactAt - now);
}

/** Get remaining time as human-readable components */
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

/** Check if the planet has been destroyed */
export function isPlanetDestroyed(impactAt: number, now: number = Date.now()): boolean {
  return now >= impactAt;
}
