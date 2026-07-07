// ---------------------------------------------------------------------------
// ASTRA onboarding catalog — one-shot explainer popups voiced by A.S.T.R.A.
//
// Each entry is shown ONCE per player (persisted via localStorage flag with
// the ASTRA_ONBOARDING_STORAGE_PREFIX; mirrored into server game_state.ui_flags
// through the SYNCED_UI_FLAG_PREFIXES mechanism in App.tsx).
//
// Two trigger kinds:
//   - level entries (minLevel set): enqueued by the level watcher in App.tsx
//     once the player reaches the level AND the main tutorial is done;
//   - event entries (no minLevel): enqueued at first-time moments
//     (first carrier_required block, first Operations Hub open, first
//     precursor card, first observatory search, first cargo shipment, …).
//
// Texts live in i18n under astraOnboarding.<key>.* (kicker/title/body).
// Voiceover clips live in public/sfx/onboarding/<key>_<uk|en>.(mp3|webm)
// and are regenerated with scripts/onboarding-voice/generate.mjs.
// ---------------------------------------------------------------------------

export type AstraOnboardingId =
  | 'grand-idea'
  | 'quarks'
  | 'carriers'
  | 'directives'
  | 'beacon'
  | 'precursor'
  | 'seasons'
  | 'observatory-events'
  | 'logistics'
  | 'genesis-lab'
  | 'biosphere'
  | 'hangar'
  | 'tech-tree'
  | 'arena'
  | 'observatories'
  | 'ast-probe'
  | 'core-zone';

/** Action ids App.tsx maps to concrete navigation ("Show me" button). */
export type AstraOnboardingAction = 'ops-directives' | 'ops-megastructure' | 'hangar' | 'cosmic-archive';

export interface AstraOnboardingEntry {
  id: AstraOnboardingId;
  /** i18n sub-key: astraOnboarding.<key>.{kicker,title,body} (dots not allowed in key path). */
  key: string;
  /** Accent color — Game Bible palette only. */
  accent: string;
  /** Level watcher threshold. Omitted for purely event-triggered entries. */
  minLevel?: number;
  /** Optional "Show me" navigation target handled by App.tsx. */
  action?: AstraOnboardingAction;
}

export const ASTRA_ONBOARDING_ENTRIES: AstraOnboardingEntry[] = [
  // ── Level / progression triggered ─────────────────────────────────────────
  // The grand idea: why the player explores at all (19 systems → neighbors →
  // the 500-star Core with precursor remains). Enqueued right after the main
  // tutorial completes (level watcher with minLevel 1).
  { id: 'grand-idea', key: 'grand_idea', accent: '#7bb8ff', minLevel: 1 },
  { id: 'quarks', key: 'quarks', accent: '#4488aa', minLevel: 2, action: 'ops-directives' },
  { id: 'tech-tree', key: 'tech_tree', accent: '#44ff88', minLevel: 3 },
  { id: 'arena', key: 'arena', accent: '#cc4444', minLevel: 10, action: 'hangar' },
  { id: 'observatories', key: 'observatories', accent: '#4488aa', minLevel: 12 },
  { id: 'ast-probe', key: 'ast_probe', accent: '#7bb8ff', minLevel: 16 },
  { id: 'core-zone', key: 'core_zone', accent: '#ff8844', minLevel: 20 },

  // ── Event triggered (first-time moments) ──────────────────────────────────
  { id: 'carriers', key: 'carriers', accent: '#ff8844' },
  { id: 'directives', key: 'directives', accent: '#44ff88' },
  { id: 'beacon', key: 'beacon', accent: '#7bb8ff' },
  { id: 'precursor', key: 'precursor', accent: '#ff8844', action: 'cosmic-archive' },
  { id: 'seasons', key: 'seasons', accent: '#4488aa' },
  { id: 'observatory-events', key: 'observatory_events', accent: '#7bb8ff' },
  { id: 'logistics', key: 'logistics', accent: '#ff8844' },
  { id: 'genesis-lab', key: 'genesis_lab', accent: '#44ff88' },
  { id: 'biosphere', key: 'biosphere', accent: '#44ff88' },
  { id: 'hangar', key: 'hangar', accent: '#4488aa' },
];

export const ASTRA_ONBOARDING_BY_ID: ReadonlyMap<AstraOnboardingId, AstraOnboardingEntry> =
  new Map(ASTRA_ONBOARDING_ENTRIES.map((e) => [e.id, e]));

export const ASTRA_ONBOARDING_STORAGE_PREFIX = 'nebulife_astra_onboarding_';

export function getAstraOnboardingStorageKey(playerId: string, id: AstraOnboardingId): string {
  return `${ASTRA_ONBOARDING_STORAGE_PREFIX}${playerId || 'guest'}_${id}`;
}

/** Minimum quiet time between two onboarding popups (ms). */
export const ASTRA_ONBOARDING_MIN_GAP_MS = 60_000;
/** Delay after app load before the first onboarding may appear (ms). */
export const ASTRA_ONBOARDING_INITIAL_DELAY_MS = 8_000;
/** Hard cap of onboarding popups per app session (rest carry over). */
export const ASTRA_ONBOARDING_MAX_PER_SESSION = 4;
