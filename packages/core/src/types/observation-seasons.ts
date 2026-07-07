// ---------------------------------------------------------------------------
// "Сезони спостережень" (Observation Seasons) — time-limited seasonal
// anomaly content on top of the observatory / cosmic-catalog system. See
// GAME_MODULES.md → Дослідження космосу → "Сезони спостережень" and
// `game/observation-seasons.ts` for the rotation data + logic.
// ---------------------------------------------------------------------------

/** Static definition of a single seasonal anomaly variant of an existing
 *  catalog category, keyed to its `CatalogEntry.type` in `cosmic-catalog.ts`. */
export interface SeasonAnomalyDef {
  /** Matches a `season-*` entry's `type` field in `cosmic-catalog.ts`. */
  type: string;
  /**
   * Existing bundled common-event asset (`/cosmic-events/common/{assetType}.webp`)
   * reused for rendering — no new AI generation for seasonal content.
   */
  assetType: string;
}

/** One rotating season theme (curated set of 5 anomalies). */
export interface SeasonDefinition {
  /** Stable id, also used as the i18n key suffix (`seasons.name.<id>`). */
  id: string;
  anomalies: SeasonAnomalyDef[];
}

/** Pure-function result of `getCurrentSeason(now)` — identical on client and server. */
export interface CurrentSeasonInfo {
  /** Monotonic global index since `SEASON_EPOCH_UTC_MS`; doubles as the occurrence id source. */
  seasonIndex: number;
  def: SeasonDefinition;
  startMs: number;
  endMs: number;
  /** Whole days left, rounded up. */
  daysRemaining: number;
  /** True during the last `SEASON_FINALE_WINDOW_MS` of the season. */
  isFinale: boolean;
  /** Stable identifier for this specific occurrence (`season-<seasonIndex>`). */
  occurrenceId: string;
}

/**
 * Player-side seasonal progress — persisted in `game_state` JSONB, mirroring
 * the `precursor_cards` / `civilization_contacts` pattern (App.tsx
 * `SyncedGameState`). Resets its working slots (`researchedTypes`,
 * `searchesSinceDrop`) whenever the tracked `seasonIndex` falls behind the
 * current one; `completedSeasons` and `claimedSeasons` are permanent
 * cross-season records (the "hall" of past seasons).
 */
export interface SeasonalProgressState {
  /** Season occurrence this progress snapshot belongs to. */
  seasonIndex: number;
  /** Anomaly `type` keys researched during the current `seasonIndex`. */
  researchedTypes: string[];
  /** Completed observatory searches since the last seasonal drop (soft pity). */
  searchesSinceDrop: number;
  /** Occurrence ids (`season-<n>`) whose 5/5 collection was fully completed. */
  completedSeasons: string[];
  /** Occurrence ids whose +150⚛ finale reward was already claimed (client mirror; server is authoritative via idempotency key). */
  claimedSeasons: string[];
}
