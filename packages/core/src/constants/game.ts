// ===== Game Balance Constants =====

/** Time before asteroid impact (seconds) */
export const ASTEROID_COUNTDOWN_SECONDS = 3600; // 1 hour

/** Number of star system rings added per player registration */
export const RINGS_PER_REGISTRATION = 2;

/** Distance between ring levels (light-years) */
export const RING_DISTANCE_LY = 5;

/** Systems per ring: 6 * ringIndex (ring 0 = 1 home system) */
export function systemsPerRing(ringIndex: number): number {
  return ringIndex === 0 ? 1 : 6 * ringIndex;
}

/** Probability of life on habitable-zone Earth-like planets */
export const LIFE_PROBABILITY = 0.15; // 15%

/** Habitability threshold for life to appear */
export const LIFE_HABITABILITY_THRESHOLD = 0.7;

/** Planet count range per star system */
export const MIN_PLANETS = 2;
export const MAX_PLANETS = 12;
export const MEAN_PLANETS = 6;

/** Doomsday ship travel speed (fraction of c) */
export const DOOMSDAY_SHIP_SPEED_C = 0.01; // 1% speed of light

/** Doomsday ship passenger capacity */
export const DOOMSDAY_SHIP_PASSENGERS = 10000;
