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
  common: 81,
  uncommon: 10,
  rare: 5,
  epic: 3,
  legendary: 1,
};

/** Rarity display labels (Ukrainian) */
export const RARITY_LABELS: Record<DiscoveryRarity, string> = {
  common: 'Штатна подія',
  uncommon: 'Аномалія',
  rare: 'Феномен',
  epic: 'Епічна знахідка',
  legendary: 'Свідок епохи',
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
 * Discovery chance per research session.
 * Ring 1: 1/5 (20%), Ring 2: 1/10 (10%), Ring 3+: halved again each ring.
 */
export function getDiscoveryChance(ringIndex: number = 1): number {
  const base = 1 / 5;
  // Ring 0 (home) and Ring 1 get base rate; each subsequent ring halves the chance
  const ringPenalty = Math.max(0, ringIndex - 1);
  return base / Math.pow(2, ringPenalty);
}

/**
 * Hook mechanic: force a discovery on the player's 2nd research session
 * to demonstrate the system and keep engagement.
 */
export function shouldForceDiscovery(totalCompletedSessions: number): boolean {
  return totalCompletedSessions === 2;
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
 * @param forceCommon    If true, skip the chance roll and force a common discovery (hook mechanic).
 * @returns A Discovery or null.
 */
export function rollForDiscovery(
  systemSeed: number,
  progress: number,
  progressGained: number,
  catalog: ReadonlyArray<{ type: string; category: CosmicObjectCategory; rarity: DiscoveryRarity; galleryCategory: GalleryCategory }>,
  forceCommon: boolean = false,
  ringIndex: number = 1,
): Discovery | null {
  const rng = new SeededRNG(systemSeed * 113 + progress * 7);

  if (!forceCommon) {
    // Check if a discovery happens at all (halved per ring from ring 2+)
    const chance = getDiscoveryChance(ringIndex);
    if (rng.next() > chance) return null;
  }

  // 1. Roll rarity (or force common for hook)
  let rarity: DiscoveryRarity = 'common';
  if (!forceCommon) {
    const rarityRoll = rng.next() * 100;
    let cumulative = 0;
    for (const [r, w] of Object.entries(RARITY_WEIGHTS) as [DiscoveryRarity, number][]) {
      cumulative += w;
      if (rarityRoll < cumulative) {
        rarity = r;
        break;
      }
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
