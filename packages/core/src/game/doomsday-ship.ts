import { C, LIGHT_YEAR } from '../constants/physics.js';
import { DOOMSDAY_SHIP_SPEED_C, DOOMSDAY_SHIP_PASSENGERS } from '../constants/game.js';
import type { DoomsdayShip } from '../types/player.js';

/** Calculate travel time in seconds between two star systems */
export function travelTimeSeconds(distanceLY: number): number {
  const distanceM = distanceLY * LIGHT_YEAR;
  const speedMs = DOOMSDAY_SHIP_SPEED_C * C;
  return distanceM / speedMs;
}

/** Calculate travel time in game days */
export function travelTimeDays(distanceLY: number): number {
  return travelTimeSeconds(distanceLY) / 86400;
}

/** Calculate distance between two positions in light-years */
export function distanceLY(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

/** Create a doomsday ship launch */
export function launchDoomsdayShip(
  originSystemId: string,
  destinationSystemId: string,
  destinationPlanetId: string,
  originPos: { x: number; y: number; z: number },
  destPos: { x: number; y: number; z: number },
  launchedAt: number = Date.now(),
): DoomsdayShip {
  const dist = distanceLY(originPos, destPos);
  const travelMs = travelTimeSeconds(dist) * 1000;

  return {
    launchedAt,
    originSystemId,
    destinationSystemId,
    destinationPlanetId,
    arrivalAt: launchedAt + travelMs,
    passengers: DOOMSDAY_SHIP_PASSENGERS,
    resources: {
      Fe: 1000, Si: 500, Al: 300, Cu: 100,
      food: 50000, water: 100000, fuel: 10000,
    },
    status: 'in-transit',
  };
}

/** Get ship travel progress (0-1) */
export function shipProgress(ship: DoomsdayShip, now: number = Date.now()): number {
  if (now >= ship.arrivalAt) return 1;
  const elapsed = now - ship.launchedAt;
  const total = ship.arrivalAt - ship.launchedAt;
  return Math.max(0, Math.min(1, elapsed / total));
}
