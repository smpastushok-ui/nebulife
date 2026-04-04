// ---------------------------------------------------------------------------
// Player Progression System — XP curve, level helpers, reward constants
// ---------------------------------------------------------------------------

import type { DiscoveryRarity } from '../game/discovery.js';

/** Maximum player level. */
export const MAX_PLAYER_LEVEL = 99;

// ── XP curve ────────────────────────────────────────────────────────────────

const XP_CURVE_BASE = 100;
const XP_CURVE_EXPONENT = 1.3;

/**
 * XP required to advance FROM level `level` TO `level + 1`.
 * E.g. xpForLevelGap(2) = XP needed to go from level 2 to level 3.
 */
export function xpForLevelGap(level: number): number {
  if (level < 2) return 0;
  return Math.floor(XP_CURVE_BASE * Math.pow(level, XP_CURVE_EXPONENT));
}

/**
 * Cumulative XP required to reach `level`.
 * Level 1 = 0 XP (starting point).
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 2; i <= level; i++) {
    total += Math.floor(XP_CURVE_BASE * Math.pow(i, XP_CURVE_EXPONENT));
  }
  return total;
}

/**
 * Compute current level from cumulative XP (1-99).
 */
export function levelFromXP(totalXP: number): number {
  if (totalXP <= 0) return 1;
  let accumulated = 0;
  for (let lvl = 2; lvl <= MAX_PLAYER_LEVEL; lvl++) {
    accumulated += Math.floor(XP_CURVE_BASE * Math.pow(lvl, XP_CURVE_EXPONENT));
    if (accumulated > totalXP) return lvl - 1;
  }
  return MAX_PLAYER_LEVEL;
}

/**
 * Fraction [0, 1) of progress within the current level.
 * Returns 1 if already at max level.
 */
export function levelProgress(totalXP: number): number {
  const currentLevel = levelFromXP(totalXP);
  if (currentLevel >= MAX_PLAYER_LEVEL) return 1;
  const currentLevelXP = xpForLevel(currentLevel);
  const nextLevelXP = xpForLevel(currentLevel + 1);
  const gap = nextLevelXP - currentLevelXP;
  if (gap <= 0) return 1;
  return (totalXP - currentLevelXP) / gap;
}

// ── XP Rewards ──────────────────────────────────────────────────────────────

export const XP_REWARDS = {
  /** Research session completes (system fully researched) */
  RESEARCH_COMPLETE: 30,
  /** Discovery detected (base, before rarity bonus) */
  DISCOVERY_BASE: 20,
  /** Additional XP per rarity tier */
  DISCOVERY_RARITY_BONUS: {
    common: 0,
    uncommon: 10,
    rare: 30,
    epic: 60,
    legendary: 100,
  } as Record<DiscoveryRarity, number>,
  /** Free telemetry scan chosen */
  TELEMETRY_SCAN: 10,
  /** Observatory (quantum focus) scan chosen */
  OBSERVATORY_SCAN: 15,
  /** Photo/telemetry saved to gallery */
  GALLERY_SAVE: 5,
  /** Building placed on colony surface */
  BUILDING_PLACED: 15,
  /** Evacuation launched (milestone) */
  EVACUATION_START: 200,
  /** Colony founded on new planet (milestone) */
  COLONY_FOUNDED: 500,
  /** 3D model generated */
  MODEL_3D_GENERATED: 25,
  /** Surface resource harvesting */
  HARVEST_TREE: 2,
  HARVEST_ORE: 2,
  HARVEST_VENT: 3,
  /** Hex ring slot unlock XP by ring */
  HEX_UNLOCK_RING1: 15,
  HEX_UNLOCK_RING2: 50,
  HEX_UNLOCK_RING3: 200,
} as const;

// ── Ring-based XP rewards ────────────────────────────────────────────────────

/**
 * XP reward for completing research on a system, scaled by zone.
 * Key matches zone name used at call sites.
 */
export const RING_XP_REWARD: Record<string, number> = {
  'ring0-1': 30,     // Personal Ring 0-1
  'ring2': 50,       // Personal Ring 2
  'neighbor': 100,   // Neighbor player systems
  'core-0': 200,     // Core entry (depth 0)
  'core-1-4': 300,   // Shallow core
  'core-5-8': 400,   // Mid core
  'core-9-12': 500,  // Deep core
};

/** XP awarded per research session (regardless of completion). */
export const SESSION_XP = 5;
