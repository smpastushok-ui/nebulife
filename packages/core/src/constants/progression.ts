// ---------------------------------------------------------------------------
// Player Progression System — XP curve, level helpers, reward constants
// ---------------------------------------------------------------------------

import type { DiscoveryRarity } from '../game/discovery.js';
import type { StarSystem } from '../types/universe.js';

/** Maximum player level. */
export const MAX_PLAYER_LEVEL = 99;

// ── XP curve ────────────────────────────────────────────────────────────────

const XP_CURVE_BASE = 75;
const XP_CURVE_EXPONENT = 1.22;

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
  RESEARCH_COMPLETE: 120,
  /** Discovery detected (base, before rarity bonus) */
  DISCOVERY_BASE: 35,
  /** Additional XP per rarity tier */
  DISCOVERY_RARITY_BONUS: {
    common: 0,
    uncommon: 25,
    rare: 75,
    epic: 160,
    legendary: 320,
  } as Record<DiscoveryRarity, number>,
  /** Free telemetry scan chosen */
  TELEMETRY_SCAN: 15,
  /** Observatory (quantum focus) scan chosen */
  OBSERVATORY_SCAN: 25,
  /** Photo/telemetry saved to gallery */
  GALLERY_SAVE: 10,
  /** Building placed on colony surface */
  BUILDING_PLACED: 35,
  /** Evacuation launched (milestone) */
  EVACUATION_START: 450,
  /** Colony founded on new planet (milestone) */
  COLONY_FOUNDED: 1200,
  /** 3D model generated */
  MODEL_3D_GENERATED: 80,
  /** Surface resource harvesting */
  HARVEST_TREE: 3,
  HARVEST_ORE: 4,
  HARVEST_VENT: 5,
  /** Hex ring slot unlock XP by ring */
  HEX_UNLOCK_RING1: 35,
  HEX_UNLOCK_RING2: 120,
  HEX_UNLOCK_RING3: 320,
  /** Planet terraforming fully completed (overall >= 95%) */
  TERRAFORM_COMPLETED: 1600,
} as const;

// ── Ring-based XP rewards ────────────────────────────────────────────────────

/**
 * XP reward for completing research on a system, scaled by zone.
 * Key matches zone name used at call sites.
 */
export const RING_XP_REWARD: Record<string, number> = {
  'ring0-1': 120,    // Personal Ring 0-1
  'ring2': 220,      // Personal Ring 2
  'neighbor': 450,   // Neighbor player systems
  'core-0': 700,     // Core entry (depth 0)
  'core-1-4': 1000,  // Shallow core
  'core-5-8': 1350,  // Mid core
  'core-9-12': 1800, // Deep core
};

/** XP awarded per research session (regardless of completion). */
export const SESSION_XP = 12;

/** Return the balanced completion XP bucket for a researched system. */
export function getSystemResearchCompletionXP(system: Pick<StarSystem, 'id' | 'ringIndex'>): number {
  const ringIndex = system.ringIndex ?? 0;
  if (ringIndex <= 1) return RING_XP_REWARD['ring0-1'];
  if (ringIndex === 2) return RING_XP_REWARD.ring2;

  if (system.id.startsWith('core-')) {
    const coreDepth = Math.max(0, ringIndex - 3);
    if (coreDepth === 0) return RING_XP_REWARD['core-0'];
    if (coreDepth <= 4) return RING_XP_REWARD['core-1-4'];
    if (coreDepth <= 8) return RING_XP_REWARD['core-5-8'];
    return RING_XP_REWARD['core-9-12'];
  }

  return RING_XP_REWARD.neighbor;
}
