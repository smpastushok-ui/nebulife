import { SeededRNG } from '../math/rng.js';
import type { GalaxyGroupMeta, PlayerGalaxyAssignment } from '../types/galaxy-map.js';
import {
  PLAYERS_PER_GROUP,
  GROUP_RADIUS,
  SPIRAL_ARM_COUNT,
  SPIRAL_A,
  SPIRAL_B,
  THETA_STEP,
  DISK_THIN_SIGMA,
  DISK_BULGE_SIGMA,
  DISK_BULGE_SCALE,
  GROUP_SCATTER,
  BRANCH_START,
  BRANCH_ANGLE_RATE,
  BRANCH_SCATTER_RATE,
} from '../constants/galaxy.js';

// ══════════════════════════════════════════════════════════════
// Galaxy spiral placement algorithm
//
// Groups alternate between N spiral arms:
//   armIndex    = groupIndex % SPIRAL_ARM_COUNT
//   armPosition = floor(groupIndex / SPIRAL_ARM_COUNT)
//
// Logarithmic spiral:
//   theta = armPosition * THETA_STEP
//   r     = SPIRAL_A * e^(SPIRAL_B * theta)
//   angle = theta + armIndex * (2*PI / SPIRAL_ARM_COUNT)
//
// Progressive branching:
//   After BRANCH_START positions along an arm, groups start
//   deviating from the base spiral angle. The deviation grows
//   with distance, naturally forming sub-arms / branches.
//
// Position:
//   x = r * cos(angle + branchDeviation) + scatter
//   y = r * sin(angle + branchDeviation) + scatter
//   z = gaussian(0, sigma(r))
//
// Adding group N never changes positions of groups 0..N-1
// ══════════════════════════════════════════════════════════════

/**
 * Derive a deterministic seed for a galaxy group.
 * Pure hash: galaxySeed + groupIndex → groupSeed.
 */
export function deriveGroupSeed(galaxySeed: number, groupIndex: number): number {
  let hash = galaxySeed;
  hash = Math.imul(hash ^ ((groupIndex + 1) * 2654435761), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

/**
 * Derive a player seed from their group seed and index within the group.
 * Each player's universe is fully deterministic from this seed.
 */
export function derivePlayerSeed(groupSeed: number, playerIndexInGroup: number): number {
  let hash = groupSeed;
  hash = Math.imul(hash ^ ((playerIndexInGroup + 1) * 2246822519), 0x45d9f3b);
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
  return (hash ^ (hash >>> 16)) >>> 0;
}

/**
 * Compute the galactic position for a single group.
 *
 * Pure function: groupIndex → position.
 * Adding new groups never changes positions of existing ones.
 *
 * Close to center: groups follow the spiral precisely.
 * Further out (armPosition > BRANCH_START): groups progressively
 * deviate from the base angle, creating sub-arms and chaotic branches.
 */
export function computeGroupPosition(
  galaxySeed: number,
  groupIndex: number,
): GalaxyGroupMeta {
  const armIndex = groupIndex % SPIRAL_ARM_COUNT;
  const armPosition = Math.floor(groupIndex / SPIRAL_ARM_COUNT);
  const groupSeed = deriveGroupSeed(galaxySeed, groupIndex);
  const rng = new SeededRNG(groupSeed);

  // Spiral angle along the arm
  const theta = armPosition * THETA_STEP;

  // Logarithmic spiral radius
  const r = SPIRAL_A * Math.exp(SPIRAL_B * theta);

  // Full angle (arm offset evenly spaced around circle)
  const armOffset = armIndex * (Math.PI * 2 / SPIRAL_ARM_COUNT);
  let angle = theta + armOffset;

  // Progressive branching: angular deviation grows with distance
  if (armPosition > BRANCH_START) {
    const branchStrength = (armPosition - BRANCH_START) * BRANCH_ANGLE_RATE;
    const deviation = rng.nextGaussian(0, branchStrength);
    angle += deviation;
  }

  // Deterministic scatter (also grows with distance for chaos at edges)
  const baseScatter = r * GROUP_SCATTER;
  const chaosMultiplier = armPosition > BRANCH_START
    ? 1.0 + (armPosition - BRANCH_START) * BRANCH_SCATTER_RATE
    : 1.0;
  const scatterX = rng.nextGaussian(0, baseScatter * chaosMultiplier);
  const scatterY = rng.nextGaussian(0, baseScatter * chaosMultiplier);

  const x = r * Math.cos(angle) + scatterX;
  const y = r * Math.sin(angle) + scatterY;

  // Z-axis: galaxy disk thickness (thicker near center = bulge)
  const bulgeWeight = Math.exp(-(r * r) / (DISK_BULGE_SCALE * DISK_BULGE_SCALE));
  const sigma = DISK_THIN_SIGMA + DISK_BULGE_SIGMA * bulgeWeight;
  const z = rng.nextGaussian(0, sigma);

  const distanceFromCenter = Math.sqrt(x * x + y * y);

  return {
    groupIndex,
    armIndex,
    armPosition,
    groupSeed,
    position: { x, y, z },
    radius: GROUP_RADIUS,
    distanceFromCenter,
  };
}

/**
 * Assign a player to a group based on global registration order.
 *
 * globalPlayerIndex = order of registration (0-based).
 * First 50 go to group 0, next 50 to group 1, etc.
 */
export function assignPlayerToGroup(
  globalPlayerIndex: number,
): PlayerGalaxyAssignment {
  const groupIndex = Math.floor(globalPlayerIndex / PLAYERS_PER_GROUP);
  const playerIndexInGroup = globalPlayerIndex % PLAYERS_PER_GROUP;
  return {
    groupIndex,
    playerIndexInGroup,
    globalPlayerIndex,
  };
}

/**
 * Build the full galaxy map for a given number of groups.
 * Each group's position is independently deterministic.
 */
export function buildGalaxyMap(
  galaxySeed: number,
  groupCount: number,
): GalaxyGroupMeta[] {
  const groups: GalaxyGroupMeta[] = [];
  for (let i = 0; i < groupCount; i++) {
    groups.push(computeGroupPosition(galaxySeed, i));
  }
  return groups;
}
