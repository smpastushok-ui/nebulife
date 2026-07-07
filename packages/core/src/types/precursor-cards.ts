// ---------------------------------------------------------------------------
// "Сигнали Предтеч" (Precursor Signals) — collectible card system dropped
// from planet research missions. See GAME_MODULES.md → Соціальне та
// спільнота → "Сигнали Предтеч".
// ---------------------------------------------------------------------------

/**
 * 4-tier rarity vocabulary for precursor cards. Mirrors the tier NAMES used
 * by the game's existing discovery rarity system (`DiscoveryRarity` in
 * `game/discovery.ts`) minus `uncommon`, which is folded into `common` for
 * this smaller 14-card manifest (see `PRECURSOR_RARITY_WEIGHTS`).
 */
export type PrecursorRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Static definition of one precursor card, part of the fixed 14-card manifest. */
export interface PrecursorCardDef {
  id: string;
  rarity: PrecursorRarity;
  /** Drops only when the researched planet is in a core-zone system (see `getPrecursorDropChance`). */
  coreOnly: boolean;
}

/** Player-owned record for a single acquired card. */
export interface PrecursorCardOwned {
  acquiredAt: number;
  missionType: string;
  systemId: string;
}

/**
 * Player-side collection state — persisted in `game_state` JSONB, mirroring
 * the `civilization_contacts` pattern (App.tsx `SyncedGameState`).
 */
export interface PrecursorCollectionState {
  owned: Record<string, PrecursorCardOwned>;
  /** Whether the player has opened the "Сигнали Предтеч" archive tab since the last new card. */
  archiveViewed: boolean;
  /** Whether the 14/14 completion reward (+100⚛) has already been granted. */
  completionRewardClaimed: boolean;
  /** Selected acquisition-sound slot (1-4), default 1. */
  sfxSlot: 1 | 2 | 3 | 4;
}

export function createPrecursorCollectionState(): PrecursorCollectionState {
  return { owned: {}, archiveViewed: true, completionRewardClaimed: false, sfxSlot: 1 };
}

/** Defensive normalizer for values coming from server JSONB / localStorage. */
export function normalizePrecursorCollectionState(value: unknown): PrecursorCollectionState {
  const base = createPrecursorCollectionState();
  if (!value || typeof value !== 'object') return base;
  const raw = value as Partial<PrecursorCollectionState>;
  const owned: Record<string, PrecursorCardOwned> = {};
  if (raw.owned && typeof raw.owned === 'object') {
    for (const [id, entry] of Object.entries(raw.owned as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object') continue;
      const e = entry as Partial<PrecursorCardOwned>;
      owned[id] = {
        acquiredAt: typeof e.acquiredAt === 'number' ? e.acquiredAt : Date.now(),
        missionType: typeof e.missionType === 'string' ? e.missionType : '',
        systemId: typeof e.systemId === 'string' ? e.systemId : '',
      };
    }
  }
  const sfxSlot = raw.sfxSlot === 2 || raw.sfxSlot === 3 || raw.sfxSlot === 4 ? raw.sfxSlot : 1;
  return {
    owned,
    archiveViewed: raw.archiveViewed !== false,
    completionRewardClaimed: raw.completionRewardClaimed === true,
    sfxSlot,
  };
}
