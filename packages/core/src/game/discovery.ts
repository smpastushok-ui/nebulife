import { SeededRNG } from '../math/rng.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** 10 cosmic + 3 biological categories */
export type CosmicObjectCategory =
  | 'nebulae'
  | 'stars'
  | 'galaxies'
  | 'phenomena'
  | 'exotic-planets'
  | 'dark-objects'
  | 'star-forming'
  | 'binaries'
  | 'small-bodies'
  | 'rogues'
  | 'flora'
  | 'fauna'
  | 'microbes';

/** Gallery display categories */
export type GalleryCategory =
  | 'cosmos'
  | 'flora'
  | 'fauna'
  | 'anomalies'
  | 'landscapes';

/** 5 rarity tiers */
export type DiscoveryRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

/** Rarity display colours (hex) */
export const RARITY_COLORS: Record<DiscoveryRarity, string> = {
  common: '#8899aa',
  uncommon: '#4488aa',
  rare: '#8844cc',
  epic: '#cc8822',
  legendary: '#cc4444',
};

/** Rarity drop weights (must sum to 100) */
export const RARITY_WEIGHTS: Record<DiscoveryRarity, number> = {
  common: 40,
  uncommon: 25,
  rare: 18,
  epic: 12,
  legendary: 5,
};

// ---------------------------------------------------------------------------
// Discovery interface
// ---------------------------------------------------------------------------

export interface Discovery {
  id: string;
  type: string;                    // CosmicObjectType key from catalog
  rarity: DiscoveryRarity;
  galleryCategory: GalleryCategory;
  category: CosmicObjectCategory;
  systemId: string;
  planetId?: string;
  timestamp: number;
  photoUrl?: string;
  scientificReport?: string;
  promptUsed?: string;
}

// ---------------------------------------------------------------------------
// Chance calculation
// ---------------------------------------------------------------------------

/**
 * Get the probability (0–1) of making a discovery this research session.
 *
 * @param progressGained  How many % the research just gained.
 * @param streakDays      Consecutive login days (0-7).
 */
export function getDiscoveryChance(
  progressGained: number,
  streakDays: number = 0,
): number {
  // Base chance: 15 % per session
  let chance = 0.15;

  // Higher progress gained → better chance (max +15 %)
  chance += Math.min(0.15, progressGained * 0.003);

  // Daily streak bonus: +5 % per day (max 7 days = +35 %)
  chance += Math.min(0.35, streakDays * 0.05);

  return Math.min(1.0, chance);
}

// ---------------------------------------------------------------------------
// Discovery roll
// ---------------------------------------------------------------------------

/**
 * Roll for a discovery after a research session completes.
 *
 * @param systemSeed     Deterministic seed from the star system.
 * @param progress       Current research progress (0-100).
 * @param progressGained How much progress was gained this session.
 * @param catalog        The full cosmic catalog array.
 * @param streakDays     Player's login streak.
 * @returns A Discovery or null.
 */
export function rollForDiscovery(
  systemSeed: number,
  progress: number,
  progressGained: number,
  catalog: ReadonlyArray<{ type: string; category: CosmicObjectCategory; rarity: DiscoveryRarity; galleryCategory: GalleryCategory }>,
  streakDays: number = 0,
): Discovery | null {
  const rng = new SeededRNG(systemSeed * 113 + progress * 7);

  // Check if a discovery happens at all
  const chance = getDiscoveryChance(progressGained, streakDays);
  if (rng.next() > chance) return null;

  // 1. Roll rarity
  const rarityRoll = rng.next() * 100;
  let cumulative = 0;
  let rarity: DiscoveryRarity = 'common';
  for (const [r, w] of Object.entries(RARITY_WEIGHTS) as [DiscoveryRarity, number][]) {
    cumulative += w;
    if (rarityRoll < cumulative) {
      rarity = r;
      break;
    }
  }

  // 2. Filter catalog to matching rarity
  const pool = catalog.filter((c) => c.rarity === rarity);
  if (pool.length === 0) return null;

  // 3. Pick random object from pool
  const idx = rng.nextInt(0, pool.length - 1);
  const entry = pool[idx];

  // 4. Generate unique discovery ID
  const id = `disc-${systemSeed}-${progress}-${Date.now().toString(36)}`;

  return {
    id,
    type: entry.type,
    rarity: entry.rarity,
    galleryCategory: entry.galleryCategory,
    category: entry.category,
    systemId: `system-${systemSeed}`,
    timestamp: Date.now(),
  };
}
