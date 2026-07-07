// ---------------------------------------------------------------------------
// Daily Directives — 3 deterministic per-player daily tasks
// ---------------------------------------------------------------------------
// Tasks are picked deterministically from (playerId, UTC date) so a reload or
// device switch always shows the same set. Progress is tracked client-side in
// game_state; completing all 3 unlocks a server-validated claim that credits
// quarks (1 normally, 5 on every 7th consecutive day).
// ---------------------------------------------------------------------------

import { cometHash } from './comet-event.js';

/** Counter ids App.tsx increments as the player acts. */
export type DirectiveMetric =
  | 'research_sessions'   // completed observatory research sessions
  | 'harvests'            // surface resource harvests
  | 'observatory_search'  // observatory catalog searches started
  | 'planet_scans'        // planet missions launched
  | 'signal_decodes'      // signal decoder minigame wins
  | 'academy_lessons'     // academy lessons/quests completed
  | 'creature_care';      // Biosphere daily care actions (Еволюція біосфери)

export interface DirectiveDef {
  id: string;
  metric: DirectiveMetric;
  target: number;
  xp: number;
  /** i18n key suffix: directives.task_<id> with {{target}} interpolation. */
  labelKey: string;
  /** Min player level for the task to enter the pool. */
  minLevel?: number;
}

/**
 * Task pool. Targets are sized for a 10–20 minute play session.
 * label keys live in locales: directives.task_<id>
 */
export const DIRECTIVE_POOL: DirectiveDef[] = [
  { id: 'research_2', metric: 'research_sessions', target: 2, xp: 20, labelKey: 'task_research' },
  { id: 'research_4', metric: 'research_sessions', target: 4, xp: 30, labelKey: 'task_research', minLevel: 5 },
  { id: 'harvest_5', metric: 'harvests', target: 5, xp: 20, labelKey: 'task_harvest' },
  { id: 'harvest_10', metric: 'harvests', target: 10, xp: 30, labelKey: 'task_harvest', minLevel: 4 },
  { id: 'obs_search_1', metric: 'observatory_search', target: 1, xp: 20, labelKey: 'task_obs_search', minLevel: 3 },
  { id: 'planet_scan_1', metric: 'planet_scans', target: 1, xp: 25, labelKey: 'task_planet_scan', minLevel: 6 },
  { id: 'decode_1', metric: 'signal_decodes', target: 1, xp: 25, labelKey: 'task_decode' },
  { id: 'academy_1', metric: 'academy_lessons', target: 1, xp: 20, labelKey: 'task_academy' },
  { id: 'creature_care_1', metric: 'creature_care', target: 1, xp: 15, labelKey: 'task_creature_care', minLevel: 6 },
];

export const DAILY_DIRECTIVE_COUNT = 3;

/** Quark rewards (server-authoritative, mirrored here for UI copy). */
export const DIRECTIVE_REWARD_QUARKS = 1;
export const DIRECTIVE_STREAK_REWARD_QUARKS = 5;
export const DIRECTIVE_STREAK_LENGTH = 7;

export interface DailyDirectiveState {
  /** YYYY-MM-DD (UTC) the state belongs to. */
  date: string;
  /** Per-metric counters accumulated today. */
  progress: Partial<Record<DirectiveMetric, number>>;
  /** True once the quark reward was claimed today. */
  claimed: boolean;
}

export function utcDayString(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/**
 * Pick today's 3 directives for a player. Deterministic: same player + same
 * UTC day always yields the same tasks. At most one task per metric.
 */
export function pickDailyDirectives(
  playerId: string,
  date: string,
  playerLevel: number,
): DirectiveDef[] {
  const eligible = DIRECTIVE_POOL.filter((d) => playerLevel >= (d.minLevel ?? 1));
  // Deterministic shuffle via hash-ranked sort.
  const ranked = [...eligible].sort((a, b) => {
    const ha = cometHash(`${playerId}:${date}:${a.id}`);
    const hb = cometHash(`${playerId}:${date}:${b.id}`);
    return ha - hb;
  });
  const picked: DirectiveDef[] = [];
  const usedMetrics = new Set<DirectiveMetric>();
  for (const def of ranked) {
    if (usedMetrics.has(def.metric)) continue;
    picked.push(def);
    usedMetrics.add(def.metric);
    if (picked.length >= DAILY_DIRECTIVE_COUNT) break;
  }
  // Tiny pools (low level) may yield <3 — fill with remaining regardless of metric.
  if (picked.length < DAILY_DIRECTIVE_COUNT) {
    for (const def of ranked) {
      if (picked.includes(def)) continue;
      picked.push(def);
      if (picked.length >= DAILY_DIRECTIVE_COUNT) break;
    }
  }
  return picked;
}

export function createDailyDirectiveState(now: number): DailyDirectiveState {
  return { date: utcDayString(now), progress: {}, claimed: false };
}

/** Roll the state to today if the stored date is stale. */
export function normalizeDailyDirectiveState(
  state: DailyDirectiveState | null | undefined,
  now: number,
): DailyDirectiveState {
  const today = utcDayString(now);
  if (!state || state.date !== today) return createDailyDirectiveState(now);
  return { date: state.date, progress: state.progress ?? {}, claimed: state.claimed === true };
}

export function bumpDirectiveMetric(
  state: DailyDirectiveState,
  metric: DirectiveMetric,
  amount = 1,
): DailyDirectiveState {
  return {
    ...state,
    progress: { ...state.progress, [metric]: (state.progress[metric] ?? 0) + amount },
  };
}

export function isDirectiveDone(state: DailyDirectiveState, def: DirectiveDef): boolean {
  return (state.progress[def.metric] ?? 0) >= def.target;
}

export function areAllDirectivesDone(state: DailyDirectiveState, defs: DirectiveDef[]): boolean {
  return defs.length > 0 && defs.every((d) => isDirectiveDone(state, d));
}
