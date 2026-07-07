// ---------------------------------------------------------------------------
// "Сезони спостережень" (Observation Seasons) — time-limited seasonal
// anomaly content layered on top of the observatory search / cosmic-catalog
// system (`observatory-search.ts` + `cosmic-catalog.ts`). See GAME_MODULES.md
// → Дослідження космосу → "Сезони спостережень".
//
// Design (mirrors comet-event.ts's shared-deterministic-schedule pattern):
//  - The season window is a PURE function of calendar time — same for every
//    player, no server cron and no stored schedule needed. Both client and
//    server call `getCurrentSeason(now)` and always agree.
//  - 4 curated season definitions (pulsar / comet / nebula / binary themes)
//    rotate in a fixed order every `SEASON_LENGTH_WEEKS` weeks.
//  - Each season's 5 anomalies are permanently registered in
//    `cosmic-catalog.ts` as `eventOnly: true` (so `getCatalogEntry` / gallery
//    / scientific-report code paths always resolve their name+description),
//    but only join the *rollable* observatory search pool while their season
//    is active — see `buildObservatoryCatalogWithSeason`.
//  - Soft pity: if `SEASON_PITY_THRESHOLD` searches complete during the
//    season without a seasonal hit, the 5 seasonal entries are duplicated
//    `SEASON_PITY_WEIGHT_MULTIPLIER`× in the pool passed to the next search,
//    boosting their relative weight in `observatory-search.ts`'s existing
//    weighted-choice pick (same mechanism as its unseen-bias weighting).
// ---------------------------------------------------------------------------

import { getCatalogEntry, type CatalogEntry } from './cosmic-catalog.js';
import type {
  CurrentSeasonInfo,
  SeasonDefinition,
  SeasonalProgressState,
} from '../types/observation-seasons.js';

export type { SeasonAnomalyDef, SeasonDefinition, CurrentSeasonInfo, SeasonalProgressState } from '../types/observation-seasons.js';

const DAY_MS = 86_400_000;

/** 7 weeks — mid-point of the approved 6-8 week window. */
export const SEASON_LENGTH_WEEKS = 7;
export const SEASON_LENGTH_MS = SEASON_LENGTH_WEEKS * 7 * DAY_MS;
/** Fixed epoch the rotation counts from (2026-01-05 UTC, a Monday — same anchor style as comet-event.ts). */
export const SEASON_EPOCH_UTC_MS = Date.UTC(2026, 0, 5);
/** Last 72h of a season show the "фінал сезону" banner + 2× seasonal drop weight. */
export const SEASON_FINALE_WINDOW_MS = 72 * 60 * 60 * 1000;
/** Finale multiplies the pity-free base weight of seasonal entries (pure client-computed UI/roll boost). */
export const SEASON_FINALE_WEIGHT_MULTIPLIER = 2;

/** Anomalies to collect to complete a season. */
export const SEASON_ANOMALY_COUNT = 5;
/** Completed observatory searches with no seasonal hit before the soft-pity boost kicks in. */
export const SEASON_PITY_THRESHOLD = 6;
/** How many extra copies of the 5 seasonal entries get folded into the search pool once pity is active. */
export const SEASON_PITY_WEIGHT_MULTIPLIER = 4;
/** Reward for completing all 5 seasonal anomalies within one season occurrence. */
export const SEASON_COLLECTION_REWARD_QUARKS = 150;

// ---------------------------------------------------------------------------
// Season definitions — 4 MVP themes, data-driven (add more by extending this
// array; rotation order is simply array order, wrapping via `% length`).
// ---------------------------------------------------------------------------

export const SEASON_DEFINITIONS: SeasonDefinition[] = [
  {
    id: 'pulsars',
    anomalies: [
      { type: 'season-pulsar-millisecond', assetType: 'white-dwarf' },
      { type: 'season-pulsar-spider', assetType: 'brown-dwarf' },
      { type: 'season-pulsar-xray', assetType: 'flare-star' },
      { type: 'season-pulsar-binary', assetType: 'eclipsing-binary' },
      { type: 'season-pulsar-magnetar', assetType: 't-type-brown-dwarf' },
    ],
  },
  {
    id: 'comets',
    anomalies: [
      { type: 'season-comet-long-period', assetType: 'comet' },
      { type: 'season-comet-short-period', assetType: 'comet' },
      { type: 'season-comet-sungrazer', assetType: 'comet' },
      { type: 'season-comet-fragmenting', assetType: 'comet' },
      { type: 'season-comet-interstellar', assetType: 'comet' },
    ],
  },
  {
    id: 'nebulae',
    anomalies: [
      { type: 'season-nebula-filamentary', assetType: 'molecular-cloud' },
      { type: 'season-nebula-dark-absorption', assetType: 'molecular-cloud' },
      { type: 'season-nebula-butterfly', assetType: 'molecular-cloud' },
      { type: 'season-nebula-nursery', assetType: 'molecular-cloud' },
      { type: 'season-nebula-remnant-wisp', assetType: 'molecular-cloud' },
    ],
  },
  {
    id: 'binaries',
    anomalies: [
      { type: 'season-binary-eclipsing-variant', assetType: 'eclipsing-binary' },
      { type: 'season-binary-spectroscopic-variant', assetType: 'spectroscopic-binary' },
      { type: 'season-binary-contact', assetType: 'eclipsing-binary' },
      { type: 'season-binary-mass-transfer', assetType: 'spectroscopic-binary' },
      { type: 'season-binary-hierarchical-triple', assetType: 'eclipsing-binary' },
    ],
  },
];

const ANOMALY_TYPES_BY_SEASON: Record<string, string[]> = Object.fromEntries(
  SEASON_DEFINITIONS.map((def) => [def.id, def.anomalies.map((a) => a.type)]),
);

const ASSET_TYPE_BY_ANOMALY: Record<string, string> = Object.fromEntries(
  SEASON_DEFINITIONS.flatMap((def) => def.anomalies.map((a) => [a.type, a.assetType])),
);

const ALL_SEASONAL_TYPES: ReadonlySet<string> = new Set(Object.values(ANOMALY_TYPES_BY_SEASON).flat());

/** True for any `type` that belongs to the seasonal anomaly manifest (any season, active or not). */
export function isSeasonalAnomalyType(type: string): boolean {
  return ALL_SEASONAL_TYPES.has(type);
}

/** Existing bundled common-event asset key to reuse for a seasonal anomaly's imagery. */
export function getSeasonalAnomalyAssetType(type: string): string | undefined {
  return ASSET_TYPE_BY_ANOMALY[type];
}

export function getSeasonDefById(id: string): SeasonDefinition | undefined {
  return SEASON_DEFINITIONS.find((def) => def.id === id);
}

export function seasonOccurrenceId(seasonIndex: number): string {
  return `season-${seasonIndex}`;
}

// ---------------------------------------------------------------------------
// Rotation — pure function of calendar time.
// ---------------------------------------------------------------------------

export function getCurrentSeason(now: number): CurrentSeasonInfo {
  const elapsed = Math.max(0, now - SEASON_EPOCH_UTC_MS);
  const seasonIndex = Math.floor(elapsed / SEASON_LENGTH_MS);
  const startMs = SEASON_EPOCH_UTC_MS + seasonIndex * SEASON_LENGTH_MS;
  const endMs = startMs + SEASON_LENGTH_MS;
  const def = SEASON_DEFINITIONS[seasonIndex % SEASON_DEFINITIONS.length];
  const daysRemaining = Math.max(0, Math.ceil((endMs - now) / DAY_MS));
  const isFinale = endMs - now <= SEASON_FINALE_WINDOW_MS;
  return { seasonIndex, def, startMs, endMs, daysRemaining, isFinale, occurrenceId: seasonOccurrenceId(seasonIndex) };
}

// ---------------------------------------------------------------------------
// Catalog integration — clone the active season's 5 catalog entries with
// `eventOnly: false` so they enter the rollable pool passed into
// `completeReadyObservatorySearches` / `completeObservatorySearch`.
// ---------------------------------------------------------------------------

export function getActiveSeasonalCatalogEntries(now: number): CatalogEntry[] {
  const { def } = getCurrentSeason(now);
  return def.anomalies
    .map((a) => getCatalogEntry(a.type))
    .filter((entry): entry is CatalogEntry => Boolean(entry))
    .map((entry) => ({ ...entry, eventOnly: false }));
}

/**
 * Builds the catalog array to pass into the observatory search-completion
 * call for `now`. Outside any special window this is just `baseCatalog`
 * (season entries stay `eventOnly` and are skipped). During a season, the 5
 * active entries are appended once (normal weighting), duplicated
 * `SEASON_PITY_WEIGHT_MULTIPLIER`× when soft-pity is active, and further
 * duplicated `SEASON_FINALE_WEIGHT_MULTIPLIER`× during the finale window
 * (multipliers stack — finale + pity is the best possible seasonal odds).
 */
export function buildObservatoryCatalogWithSeason(
  baseCatalog: ReadonlyArray<CatalogEntry>,
  now: number,
  pityActive: boolean,
): CatalogEntry[] {
  const { isFinale } = getCurrentSeason(now);
  const seasonal = getActiveSeasonalCatalogEntries(now);
  if (seasonal.length === 0) return [...baseCatalog];
  const copies = (pityActive ? SEASON_PITY_WEIGHT_MULTIPLIER : 1) * (isFinale ? SEASON_FINALE_WEIGHT_MULTIPLIER : 1);
  const boosted = Array.from({ length: copies }, () => seasonal).flat();
  return [...baseCatalog, ...boosted];
}

// ---------------------------------------------------------------------------
// Player progress — pure state transitions, persisted via game_state JSONB.
// ---------------------------------------------------------------------------

export function createSeasonalProgressState(now: number = Date.now()): SeasonalProgressState {
  return {
    seasonIndex: getCurrentSeason(now).seasonIndex,
    researchedTypes: [],
    searchesSinceDrop: 0,
    completedSeasons: [],
    claimedSeasons: [],
  };
}

/** Defensive normalizer for values coming from server JSONB / localStorage. */
export function normalizeSeasonalProgressState(value: unknown, now: number = Date.now()): SeasonalProgressState {
  const base = createSeasonalProgressState(now);
  if (!value || typeof value !== 'object') return base;
  const raw = value as Partial<SeasonalProgressState>;
  const state: SeasonalProgressState = {
    seasonIndex: Number.isFinite(raw.seasonIndex) ? Math.max(0, Math.floor(raw.seasonIndex as number)) : base.seasonIndex,
    researchedTypes: Array.isArray(raw.researchedTypes)
      ? raw.researchedTypes.filter((t): t is string => typeof t === 'string')
      : [],
    searchesSinceDrop: Number.isFinite(raw.searchesSinceDrop) ? Math.max(0, Math.floor(raw.searchesSinceDrop as number)) : 0,
    completedSeasons: Array.isArray(raw.completedSeasons)
      ? raw.completedSeasons.filter((t): t is string => typeof t === 'string')
      : [],
    claimedSeasons: Array.isArray(raw.claimedSeasons)
      ? raw.claimedSeasons.filter((t): t is string => typeof t === 'string')
      : [],
  };
  return advanceSeasonalProgress(state, now);
}

/**
 * Rolls tracked progress forward to the current season occurrence. If the
 * previous occurrence had all 5 anomalies researched, its occurrence id is
 * archived into `completedSeasons` (the permanent "hall") before the working
 * slots reset. Pure function of (state, now) — safe to call on every
 * load/hydrate/tick without side effects; a no-op while still in-season.
 */
export function advanceSeasonalProgress(state: SeasonalProgressState, now: number): SeasonalProgressState {
  const current = getCurrentSeason(now);
  if (state.seasonIndex === current.seasonIndex) return state;
  const priorOccurrenceId = seasonOccurrenceId(state.seasonIndex);
  const priorDef = SEASON_DEFINITIONS[state.seasonIndex % SEASON_DEFINITIONS.length];
  const priorComplete = Boolean(priorDef) && priorDef.anomalies.every((a) => state.researchedTypes.includes(a.type));
  const completedSeasons = priorComplete && !state.completedSeasons.includes(priorOccurrenceId)
    ? [...state.completedSeasons, priorOccurrenceId]
    : state.completedSeasons;
  return {
    seasonIndex: current.seasonIndex,
    researchedTypes: [],
    searchesSinceDrop: 0,
    completedSeasons,
    claimedSeasons: state.claimedSeasons,
  };
}

/**
 * Applies the result of ONE completed observatory search to seasonal
 * progress. `discoveredType` is the discovery's catalog `type` (or `null`
 * for a no-signal search) — pass every `completeReadyObservatorySearches`
 * result through this in order when several searches finish in the same tick.
 */
export function applySeasonalObservatoryResult(
  state: SeasonalProgressState,
  now: number,
  discoveredType: string | null,
): SeasonalProgressState {
  const advanced = advanceSeasonalProgress(state, now);
  const current = getCurrentSeason(now);
  const isSeasonalHit = discoveredType != null && ANOMALY_TYPES_BY_SEASON[current.def.id].includes(discoveredType);
  if (isSeasonalHit) {
    const researchedTypes = advanced.researchedTypes.includes(discoveredType as string)
      ? advanced.researchedTypes
      : [...advanced.researchedTypes, discoveredType as string];
    return { ...advanced, researchedTypes, searchesSinceDrop: 0 };
  }
  return { ...advanced, searchesSinceDrop: advanced.searchesSinceDrop + 1 };
}

export function isSeasonCollectionComplete(state: SeasonalProgressState, now: number): boolean {
  const current = getCurrentSeason(now);
  if (state.seasonIndex !== current.seasonIndex) return false;
  return current.def.anomalies.every((a) => state.researchedTypes.includes(a.type));
}
