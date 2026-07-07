// ---------------------------------------------------------------------------
// "Сага Ткача" — personal AI-written illustrated chronicle of the player's
// journey. See GAME_MODULES.md → AI-контент, and GAME_BIBLE.md for the
// in-universe Ткач (Weaver) framing shared with Precursor Signals lore and
// the "Message the Weaver" feedback channel.
// ---------------------------------------------------------------------------

/**
 * Milestone moments that can trigger a new chapter. Detection is entirely
 * client-side (App.tsx observes existing game-state transitions); the server
 * only trusts `UNIQUE(player_id, milestone_type)` to make each one write-once.
 */
export type SagaMilestoneType =
  | 'doomsday_arrival'
  | 'first_colonization'
  | 'level_10'
  | 'level_20'
  | 'level_35'
  | 'first_legendary_discovery'
  | 'first_creature_settled'
  | 'civilization_integrated';

/**
 * Compact, milestone-specific facts the client already has on hand at the
 * moment of the trigger. Kept as a loose string/number record (not a
 * discriminated union) so the generate-chapter endpoint can stay generic —
 * every field is optional and only used as flavor context for the prompt.
 */
export interface SagaMilestoneContext {
  level?: number;
  planetName?: string;
  planetType?: string;
  systemName?: string;
  objectType?: string;
  civilizationName?: string;
  [key: string]: string | number | undefined;
}

/** One entry in the player's "triggered but not yet written" queue, mirrored
 *  in `game_state.saga_milestone_queue` (JSONB) — same persistence pattern as
 *  `civilization_contacts`. */
export interface SagaMilestoneQueueItem {
  id: string;
  milestoneType: SagaMilestoneType;
  context: SagaMilestoneContext;
  triggeredAt: number;
}

/** Shape returned by the server for a written chapter (list + generate). */
export interface SagaChapterSummary {
  id: string;
  milestoneType: SagaMilestoneType;
  title: string;
  bodyText: string;
  imageUrl: string | null;
  language: string;
  createdAt: string;
}
