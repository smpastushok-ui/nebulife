// ---------------------------------------------------------------------------
// "Сага Ткача" — pure helpers shared by client (milestone queueing) and
// server (daily generation cap). See packages/core/src/types/saga.ts for the
// data shapes and GAME_MODULES.md for the module overview.
// ---------------------------------------------------------------------------

import type { SagaMilestoneContext, SagaMilestoneQueueItem, SagaMilestoneType } from '../types/saga.js';

/** Canonical chronological order — used as a stable sort fallback and to
 *  build the "chapters remaining" hint. Chapters themselves are always
 *  ordered by `created_at` in the reader (a player could in theory reach
 *  milestones out of this order, e.g. a legendary discovery before L10). */
export const SAGA_MILESTONE_ORDER: SagaMilestoneType[] = [
  'doomsday_arrival',
  'first_colonization',
  'level_10',
  'first_legendary_discovery',
  'first_creature_settled',
  'level_20',
  'civilization_integrated',
  'level_35',
];

/** Cost-control cap (Game Bible §0.4-bis: chapters are free for milestones,
 *  but generation still costs a Gemini text + image call). Enforced
 *  server-side in api/saga/generate-chapter.ts — this constant is the single
 *  source of truth for both the server check and any client-side messaging. */
export const SAGA_DAILY_CHAPTER_CAP = 1;

/**
 * Appends a milestone to the queue unless it was already triggered before
 * (queued, written, or otherwise recorded) — pure, so App.tsx can call this
 * from any of the several trigger sites without duplicating the dedup logic.
 * Returns the same array reference when there is nothing to add.
 */
export function queueSagaMilestone(
  queue: SagaMilestoneQueueItem[],
  triggered: string[],
  milestoneType: SagaMilestoneType,
  context: SagaMilestoneContext,
  now: number = Date.now(),
): { queue: SagaMilestoneQueueItem[]; triggered: string[]; added: boolean } {
  if (triggered.includes(milestoneType)) {
    return { queue, triggered, added: false };
  }
  const item: SagaMilestoneQueueItem = {
    id: `saga-${milestoneType}-${now}`,
    milestoneType,
    context,
    triggeredAt: now,
  };
  return {
    queue: [...queue, item],
    triggered: [...triggered, milestoneType],
    added: true,
  };
}

const ROMAN_TABLE: Array<[number, string]> = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

/** Roman numeral for chapter indices in the reader ("I", "II", "III", ...). */
export function toRomanNumeral(n: number): string {
  let value = Math.max(1, Math.floor(n));
  let out = '';
  for (const [amount, symbol] of ROMAN_TABLE) {
    while (value >= amount) {
      out += symbol;
      value -= amount;
    }
  }
  return out;
}
