import { SeededRNG, seedFromString } from '../math/rng.js';
import type { CatalogEntry } from './cosmic-catalog.js';
import type { Discovery, DiscoveryRarity } from './discovery.js';
import type {
  ObservatoryEventRecord,
  ObservatorySearchDuration,
  ObservatorySearchProgram,
  ObservatorySearchSession,
  ObservatoryState,
} from '../types/observatory.js';

export const OBSERVATORY_SEARCH_DURATION_MS: Record<ObservatorySearchDuration, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

const LEVEL_XP = [0, 100, 280, 620, 1100] as const;
const UNSEEN_WEIGHTS = [5, 7, 9, 11, 13] as const;
const DUPLICATE_PITY_THRESHOLD = 3;

const LEVEL_DISCOVERY_CHANCE = [0.1, 0.2, 0.3, 0.35, 0.4] as const;

const PROGRAM_LEVEL: Record<ObservatorySearchProgram, number> = {
  routine_sky_watch: 1,
  anomaly_sweep: 2,
  phenomenon_survey: 3,
  deep_space_watch: 4,
  catalog_completion: 5,
};

const PROGRAM_RARITY_WEIGHTS: Record<ObservatorySearchProgram, Partial<Record<DiscoveryRarity, number>>> = {
  routine_sky_watch: { common: 74, uncommon: 18, rare: 8 },
  anomaly_sweep: { common: 58, uncommon: 28, rare: 14 },
  phenomenon_survey: { common: 44, uncommon: 28, rare: 24, epic: 4 },
  deep_space_watch: { common: 32, uncommon: 24, rare: 24, epic: 16, legendary: 4 },
  catalog_completion: { common: 24, uncommon: 24, rare: 24, epic: 20, legendary: 8 },
};

const DURATION_RARITY_WEIGHTS: Record<ObservatorySearchDuration, Partial<Record<DiscoveryRarity, number>>> = {
  // Short searches are useful daily taps: mostly standard events, with a
  // small window into unusual/rare signatures.
  '1h': { common: 70, uncommon: 22, rare: 8 },
  // Six hours is the main rare-event workhorse and can reach epic signals.
  '6h': { uncommon: 32, rare: 50, epic: 16, legendary: 2 },
  // Full-day searches listen for deep-space high-rarity signatures. If this
  // roll misses, completeObservatorySearch grants a standard fallback so a
  // 24h wait never feels wasted.
  '24h': { epic: 72, legendary: 28 },
};

const UNIQUE_XP: Record<DiscoveryRarity, number> = {
  common: 15,
  uncommon: 25,
  rare: 40,
  epic: 65,
  legendary: 100,
};

export interface ObservatorySearchResult {
  state: ObservatoryState;
  session: ObservatorySearchSession;
  discovery: Discovery | null;
  duplicate: boolean;
  xpGained: number;
  leveledUp: boolean;
}

export function createObservatoryState(): ObservatoryState {
  return {
    xp: 0,
    searchesCompleted: 0,
    successfulSignals: 0,
    duplicateSignals: 0,
    duplicateStreak: 0,
    sessions: [],
    events: {},
    reports: [],
  };
}

export function normalizeObservatoryState(value: unknown): ObservatoryState {
  const fallback = createObservatoryState();
  if (!value || typeof value !== 'object') return fallback;
  const raw = value as Partial<ObservatoryState>;
  return {
    xp: Number.isFinite(raw.xp) ? Math.max(0, Math.floor(raw.xp ?? 0)) : 0,
    searchesCompleted: Number.isFinite(raw.searchesCompleted) ? Math.max(0, Math.floor(raw.searchesCompleted ?? 0)) : 0,
    successfulSignals: Number.isFinite(raw.successfulSignals) ? Math.max(0, Math.floor(raw.successfulSignals ?? 0)) : 0,
    duplicateSignals: Number.isFinite(raw.duplicateSignals) ? Math.max(0, Math.floor(raw.duplicateSignals ?? 0)) : 0,
    duplicateStreak: Number.isFinite(raw.duplicateStreak) ? Math.max(0, Math.floor(raw.duplicateStreak ?? 0)) : 0,
    sessions: Array.isArray(raw.sessions) ? raw.sessions.filter(isValidSession) : [],
    events: raw.events && typeof raw.events === 'object' ? raw.events as Record<string, ObservatoryEventRecord> : {},
    reports: Array.isArray(raw.reports) ? raw.reports.slice(-25) as ObservatoryState['reports'] : [],
  };
}

export function getObservatoryLevel(state: Pick<ObservatoryState, 'xp'>): number {
  let level = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) {
    if (state.xp >= LEVEL_XP[i]) level = i + 1;
  }
  return Math.min(5, level);
}

export function getObservatoryXpProgress(state: Pick<ObservatoryState, 'xp'>): { level: number; current: number; required: number; pct: number } {
  const level = getObservatoryLevel(state);
  if (level >= 5) return { level, current: state.xp - LEVEL_XP[4], required: 0, pct: 100 };
  const min = LEVEL_XP[level - 1];
  const max = LEVEL_XP[level];
  const current = Math.max(0, state.xp - min);
  const required = Math.max(1, max - min);
  return { level, current, required, pct: Math.round((current / required) * 100) };
}

export function getAvailableObservatoryPrograms(level: number): ObservatorySearchProgram[] {
  return (Object.keys(PROGRAM_LEVEL) as ObservatorySearchProgram[]).filter((program) => PROGRAM_LEVEL[program] <= level);
}

export function getObservatorySearchChance(_duration: ObservatorySearchDuration, level: number): number {
  const normalizedLevel = Math.max(1, Math.min(5, Math.floor(level)));
  const chance = LEVEL_DISCOVERY_CHANCE[normalizedLevel - 1] ?? LEVEL_DISCOVERY_CHANCE[0];
  return chance;
}

export function startObservatorySearch(
  state: ObservatoryState,
  duration: ObservatorySearchDuration,
  program: ObservatorySearchProgram,
  now: number,
  seedBase: string | number,
): ObservatoryState {
  const level = getObservatoryLevel(state);
  if (PROGRAM_LEVEL[program] > level) return state;
  const seed = typeof seedBase === 'number'
    ? seedBase
    : seedFromString(`${seedBase}:${state.searchesCompleted}:${state.sessions.length}:${now}:${duration}:${program}`);
  const session: ObservatorySearchSession = {
    id: `obs-${now.toString(36)}-${Math.abs(seed).toString(36)}`,
    duration,
    program,
    startedAt: now,
    completesAt: now + OBSERVATORY_SEARCH_DURATION_MS[duration],
    seed,
  };
  return { ...state, sessions: [...state.sessions, session] };
}

export function completeObservatorySearch(
  state: ObservatoryState,
  sessionId: string,
  catalog: ReadonlyArray<CatalogEntry>,
  now: number,
): ObservatorySearchResult | null {
  const session = state.sessions.find((item) => item.id === sessionId);
  if (!session || now < session.completesAt) return null;
  const previousLevel = getObservatoryLevel(state);
  const discovery = rollObservatoryDiscovery(state, session, catalog);
  const remaining = state.sessions.filter((item) => item.id !== sessionId);

  if (!discovery) {
    if (session.duration === '24h') {
      const fallbackDiscovery = rollObservatoryFallbackDiscovery(state, session, catalog);
      if (fallbackDiscovery) {
        return applyObservatoryDiscovery(state, remaining, session, fallbackDiscovery, previousLevel);
      }
    }
    const nextState = {
      ...state,
      sessions: remaining,
      searchesCompleted: state.searchesCompleted + 1,
      duplicateStreak: state.duplicateStreak + 1,
      reports: [
        ...(state.reports ?? []),
        {
          id: `obs-report-${session.id}`,
          sessionId: session.id,
          duration: session.duration,
          program: session.program,
          completedAt: now,
          discoveryType: null,
          rarity: null,
          duplicate: false,
          xpGained: 0,
          leveledUp: false,
        },
      ].slice(-25),
    };
    return { state: nextState, session, discovery: null, duplicate: false, xpGained: 0, leveledUp: false };
  }

  return applyObservatoryDiscovery(state, remaining, session, discovery, previousLevel);
}

function applyObservatoryDiscovery(
  state: ObservatoryState,
  remaining: ObservatorySearchSession[],
  session: ObservatorySearchSession,
  discovery: Discovery,
  previousLevel: number,
): ObservatorySearchResult {
  const existing = state.events[discovery.type];
  const duplicate = Boolean(existing);
  const xpGained = duplicate
    ? Math.max(3, Math.round(UNIQUE_XP[discovery.rarity] * 0.2))
    : UNIQUE_XP[discovery.rarity];
  const record: ObservatoryEventRecord = existing
    ? { ...existing, count: existing.count + 1, lastDiscoveredAt: discovery.timestamp }
    : {
        type: discovery.type,
        rarity: discovery.rarity,
        count: 1,
        firstDiscoveredAt: discovery.timestamp,
        lastDiscoveredAt: discovery.timestamp,
      };
  const nextState: ObservatoryState = {
    ...state,
    xp: state.xp + xpGained,
    sessions: remaining,
    searchesCompleted: state.searchesCompleted + 1,
    successfulSignals: state.successfulSignals + 1,
    duplicateSignals: state.duplicateSignals + (duplicate ? 1 : 0),
    duplicateStreak: duplicate ? state.duplicateStreak + 1 : 0,
    events: { ...state.events, [discovery.type]: record },
    reports: [
      ...(state.reports ?? []),
      {
        id: `obs-report-${session.id}`,
        sessionId: session.id,
        duration: session.duration,
        program: session.program,
        completedAt: discovery.timestamp,
        discoveryType: discovery.type,
        rarity: discovery.rarity,
        duplicate,
        xpGained,
        leveledUp: getObservatoryLevel({ xp: state.xp + xpGained }) > previousLevel,
      },
    ].slice(-25),
  };

  return {
    state: nextState,
    session,
    discovery,
    duplicate,
    xpGained,
    leveledUp: getObservatoryLevel(nextState) > previousLevel,
  };
}

export function completeReadyObservatorySearches(
  state: ObservatoryState,
  catalog: ReadonlyArray<CatalogEntry>,
  now: number,
): { state: ObservatoryState; results: ObservatorySearchResult[] } {
  let current = state;
  const results: ObservatorySearchResult[] = [];
  for (const session of [...state.sessions].sort((a, b) => a.completesAt - b.completesAt)) {
    const result = completeObservatorySearch(current, session.id, catalog, now);
    if (result) {
      current = result.state;
      results.push(result);
    }
  }
  return { state: current, results };
}

export function rollObservatoryDiscovery(
  state: ObservatoryState,
  session: ObservatorySearchSession,
  catalog: ReadonlyArray<CatalogEntry>,
): Discovery | null {
  const level = getObservatoryLevel(state);
  const rng = new SeededRNG(session.seed ^ Math.floor(session.completesAt / 1000));
  const detectionChance = session.duration === '24h'
    ? getObservatoryHighValueChance(level)
    : getObservatorySearchChance(session.duration, level);
  if (rng.next() > detectionChance) return null;

  const program = PROGRAM_LEVEL[session.program] <= level ? session.program : getAvailableObservatoryPrograms(level)[0];
  const rarity = pickRarity(rng, session.duration, program);
  return selectDiscoveryFromCatalog(state, session, catalog, rng, rarity, level);
}

export function estimateObservatoryCompletionDays(catalogSize: number): number {
  return Math.max(120, Math.ceil(catalogSize * 3.15));
}

function getObservatoryHighValueChance(level: number): number {
  const normalizedLevel = Math.max(1, Math.min(5, Math.floor(level)));
  return LEVEL_DISCOVERY_CHANCE[normalizedLevel - 1] ?? LEVEL_DISCOVERY_CHANCE[0];
}

function rollObservatoryFallbackDiscovery(
  state: ObservatoryState,
  session: ObservatorySearchSession,
  catalog: ReadonlyArray<CatalogEntry>,
): Discovery | null {
  const level = getObservatoryLevel(state);
  const rng = new SeededRNG((session.seed ^ 0x5f3759df) + Math.floor(session.completesAt / 1000));
  return selectDiscoveryFromCatalog(state, session, catalog, rng, 'common', level);
}

function selectDiscoveryFromCatalog(
  state: ObservatoryState,
  session: ObservatorySearchSession,
  catalog: ReadonlyArray<CatalogEntry>,
  rng: SeededRNG,
  rarity: DiscoveryRarity,
  level: number,
): Discovery | null {
  let pool = catalog.filter((entry) => entry.rarity === rarity);
  if (pool.length === 0) pool = [...catalog];
  if (pool.length === 0) return null;

  const hasUnseenInPool = pool.some((entry) => !state.events[entry.type]);
  const forceUnseen = state.duplicateStreak >= DUPLICATE_PITY_THRESHOLD && hasUnseenInPool;
  if (forceUnseen) {
    pool = pool.filter((entry) => !state.events[entry.type]);
  }

  const unseenWeight = UNSEEN_WEIGHTS[Math.min(UNSEEN_WEIGHTS.length - 1, level - 1)];
  const selected = rng.weightedChoice(
    pool,
    pool.map((entry) => state.events[entry.type] ? 1 : unseenWeight),
  );

  return {
    id: `obs-disc-${selected.type}-${session.completesAt.toString(36)}-${rng.nextInt(1000, 9999)}`,
    type: selected.type,
    rarity: selected.rarity,
    galleryCategory: selected.galleryCategory,
    category: selected.category,
    systemId: `observatory-${session.program}`,
    timestamp: session.completesAt,
  };
}

function pickRarity(
  rng: SeededRNG,
  duration: ObservatorySearchDuration,
  program: ObservatorySearchProgram,
): DiscoveryRarity {
  const durationWeights = DURATION_RARITY_WEIGHTS[duration];
  const programWeights = PROGRAM_RARITY_WEIGHTS[program];
  const combinedWeights: Partial<Record<DiscoveryRarity, number>> = {};
  const rarities = Array.from(new Set([
    ...Object.keys(durationWeights),
    ...Object.keys(programWeights),
  ])) as DiscoveryRarity[];

  for (const rarity of rarities) {
    const durationWeight = durationWeights[rarity] ?? 0;
    const programWeight = programWeights[rarity] ?? 0;
    const combinedWeight = durationWeight * (0.7 + programWeight / 100);
    if (combinedWeight > 0) combinedWeights[rarity] = combinedWeight;
  }

  const weightedRarities = Object.keys(combinedWeights) as DiscoveryRarity[];
  return rng.weightedChoice(weightedRarities, weightedRarities.map((rarity) => combinedWeights[rarity] ?? 0));
}

function isValidSession(value: unknown): value is ObservatorySearchSession {
  if (!value || typeof value !== 'object') return false;
  const raw = value as ObservatorySearchSession;
  return Boolean(raw.id)
    && (raw.duration === '1h' || raw.duration === '6h' || raw.duration === '24h')
    && Boolean(PROGRAM_LEVEL[raw.program])
    && Number.isFinite(raw.startedAt)
    && Number.isFinite(raw.completesAt)
    && Number.isFinite(raw.seed);
}
