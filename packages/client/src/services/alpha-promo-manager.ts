import type { DiscoveryRarity } from '@nebulife/core';

export type AlphaPromoTrigger =
  | 'lifeform_locked'
  | 'event_locked'
  | 'insufficient_quarks'
  | 'post_reveal';

export interface AlphaPromoDecisionInput {
  playerId: string;
  trigger: AlphaPromoTrigger;
  objectId: string;
  rarity?: DiscoveryRarity;
  quarks: number;
  isPremium: boolean;
  isGuest: boolean;
  now?: number;
}

export interface AlphaPromoDecision {
  show: boolean;
  reason:
    | 'allowed'
    | 'guest'
    | 'premium'
    | 'common'
    | 'missing_object'
    | 'object_seen'
    | 'session_cap'
    | 'daily_cap'
    | 'cooldown'
    | 'cadence';
  video?: AlphaPromoVideo;
}

export interface AlphaPromoVideo {
  id: string;
  /** Primary source (WebM/VP9 — smaller, preferred on modern iOS/Android). */
  src: string;
  /**
   * H.264/AAC MP4 fallback. WebM/VP9 in WKWebView has known playback gaps on
   * iOS < 17.4 and intermittent WKWebView-specific bugs even on newer iOS
   * (see videojs/video.js#8895), so every promo video ships an MP4 fallback
   * source the <video> element can pick if WebM silently fails to decode.
   */
  fallbackSrc: string;
}

interface AlphaPromoStoredState {
  day: string;
  shownToday: number;
  lockedOpportunities: number;
  lastShownAt: number;
  seenOpportunities: Record<string, number>;
  shownObjects: Record<string, number>;
}

const STORAGE_PREFIX = 'nebulife_alpha_promo';
const SESSION_KEY = '__nebulife_alpha_promo_session_count__';
const DAILY_SHOW_LIMIT = 3;
const SESSION_SHOW_LIMIT = 1;
const COOLDOWN_MS = 20 * 60 * 1000;
const CADENCE = 3;
// Per-player "already watched" list, keyed by video id. Prefixed (not a fixed
// key) because the player id is baked into the storage key — see
// SYNCED_UI_FLAG_PREFIXES in App.tsx, which mirrors this into
// game_state.ui_flags so the no-repeat guarantee survives reinstall/relogin
// on a different device, not just this browser's localStorage.
const SEEN_VIDEOS_STORAGE_PREFIX = 'nebulife_alpha_promo_seen_';
const ALPHA_PROMO_VIDEO_BASE_PATH = '/alpha-promo';
const FALLBACK_ALPHA_PROMO_VIDEO: AlphaPromoVideo = {
  id: 'astra-alpha-signal',
  src: '/astra/astra-video.mp4',
  fallbackSrc: '/astra/astra-video.mp4',
};

export const ALPHA_PROMO_VIDEOS: readonly AlphaPromoVideo[] = [
  alphaPromoVideo('veteran-captain-quarks', 'veteran-captain-quarks.webm', 'veteran-captain-quarks.mp4'),
  alphaPromoVideo('skeptic-changed-mind', 'skeptic-changed-mind.webm', 'skeptic-changed-mind.mp4'),
  alphaPromoVideo('professor-unique-lifeform', 'professor-unique-lifeform.webm', 'professor-unique-lifeform.mp4'),
  alphaPromoVideo('pilot-asteroid-timer', 'pilot-asteroid-timer.webm', 'pilot-asteroid-timer.mp4'),
  alphaPromoVideo('survey-officer-social-proof', 'survey-officer-social-proof.webm', 'survey-officer-social-proof.mp4'),
  alphaPromoVideo('pathfinder-greedy-quasar', 'pathfinder-greedy-quasar.webm', 'pathfinder-greedy-quasar.mp4'),
  alphaPromoVideo('pathfinder-lost-discovery', 'pathfinder-lost-discovery.webm', 'pathfinder-lost-discovery.mp4'),
  alphaPromoVideo('engineer-quark-value', 'engineer-quark-value.webm', 'engineer-quark-value.mp4'),
  alphaPromoVideo('commander-alpha-status', 'commander-alpha-status.webm', 'commander-alpha-status.mp4'),
];

export function alphaPromoVideo(id: string, fileName: string, fallbackFileName: string): AlphaPromoVideo {
  return {
    id,
    src: `${ALPHA_PROMO_VIDEO_BASE_PATH}/${fileName}`,
    fallbackSrc: `${ALPHA_PROMO_VIDEO_BASE_PATH}/${fallbackFileName}`,
  };
}

function todayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function storageKey(playerId: string): string {
  return `${STORAGE_PREFIX}_${playerId || 'local'}`;
}

function seenVideosKey(playerId: string): string {
  return `${SEEN_VIDEOS_STORAGE_PREFIX}${playerId || 'local'}`;
}

function readSeenVideoIds(playerId: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(seenVideosKey(playerId)) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeSeenVideoIds(playerId: string, ids: string[]): void {
  try {
    localStorage.setItem(seenVideosKey(playerId), JSON.stringify(ids));
  } catch {
    // Non-critical UI state.
  }
}

function getSessionCount(): number {
  const value = (globalThis as unknown as Record<string, unknown>)[SESSION_KEY];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function setSessionCount(value: number): void {
  (globalThis as unknown as Record<string, unknown>)[SESSION_KEY] = value;
}

function emptyState(now: number): AlphaPromoStoredState {
  return {
    day: todayKey(now),
    shownToday: 0,
    lockedOpportunities: 0,
    lastShownAt: 0,
    seenOpportunities: {},
    shownObjects: {},
  };
}

function readState(playerId: string, now: number): AlphaPromoStoredState {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(playerId)) ?? 'null') as Partial<AlphaPromoStoredState> | null;
    if (!parsed || typeof parsed !== 'object') return emptyState(now);
    const day = parsed.day === todayKey(now) ? parsed.day : todayKey(now);
    return {
      day,
      shownToday: parsed.day === day && typeof parsed.shownToday === 'number' ? parsed.shownToday : 0,
      lockedOpportunities: typeof parsed.lockedOpportunities === 'number' ? parsed.lockedOpportunities : 0,
      lastShownAt: typeof parsed.lastShownAt === 'number' ? parsed.lastShownAt : 0,
      seenOpportunities: parsed.seenOpportunities && typeof parsed.seenOpportunities === 'object' ? parsed.seenOpportunities as Record<string, number> : {},
      shownObjects: parsed.shownObjects && typeof parsed.shownObjects === 'object' ? parsed.shownObjects as Record<string, number> : {},
    };
  } catch {
    return emptyState(now);
  }
}

function writeState(playerId: string, state: AlphaPromoStoredState): void {
  try {
    localStorage.setItem(storageKey(playerId), JSON.stringify(state));
  } catch {
    // Promo cadence is non-critical UI state.
  }
}

function isCommonOrLower(rarity?: DiscoveryRarity): boolean {
  return !rarity || rarity === 'common';
}

export function pickRandomAlphaPromoVideo(
  videos: readonly AlphaPromoVideo[] = ALPHA_PROMO_VIDEOS,
): AlphaPromoVideo {
  const available = videos.length > 0 ? videos : [FALLBACK_ALPHA_PROMO_VIDEO];
  const index = Math.floor(Math.random() * available.length);
  return available[index] ?? available[0] ?? FALLBACK_ALPHA_PROMO_VIDEO;
}

/**
 * Pick the next promo video for a player with a "shuffle bag" no-repeat
 * guarantee: every registered video is shown at most once before any video
 * repeats. Once the player has seen every video at least once, the seen-list
 * resets and the rotation starts a fresh cycle (rather than stopping the
 * promo entirely) — the videos exist to drive quark purchases, and going
 * permanently silent after ~9 views would throw away a working monetization
 * touchpoint for long-lived players. Reshuffling keeps the "never twice in a
 * row / never an obvious short loop" guarantee while keeping the feature alive.
 */
export function pickNextAlphaPromoVideoForPlayer(
  playerId: string,
  videos: readonly AlphaPromoVideo[] = ALPHA_PROMO_VIDEOS,
): AlphaPromoVideo {
  const seenIds = readSeenVideoIds(playerId);
  const unseen = videos.filter((video) => !seenIds.includes(video.id));
  const startingNewCycle = unseen.length === 0;
  const pool = startingNewCycle ? videos : unseen;
  const video = pickRandomAlphaPromoVideo(pool);
  writeSeenVideoIds(playerId, startingNewCycle ? [video.id] : [...seenIds, video.id]);
  return video;
}

export function shouldShowAlphaPromo(input: AlphaPromoDecisionInput): AlphaPromoDecision {
  const now = input.now ?? Date.now();
  if (!input.objectId) return { show: false, reason: 'missing_object' };
  if (input.isGuest) return { show: false, reason: 'guest' };
  if (input.isPremium) return { show: false, reason: 'premium' };
  if (isCommonOrLower(input.rarity)) return { show: false, reason: 'common' };

  const state = readState(input.playerId, now);
  const objectKey = `${input.trigger}:${input.objectId}`;
  if (state.shownObjects[objectKey] || state.seenOpportunities[objectKey]) return { show: false, reason: 'object_seen' };

  const sessionCount = getSessionCount();
  if (sessionCount >= SESSION_SHOW_LIMIT) return { show: false, reason: 'session_cap' };
  if (state.shownToday >= DAILY_SHOW_LIMIT) return { show: false, reason: 'daily_cap' };
  if (state.lastShownAt > 0 && now - state.lastShownAt < COOLDOWN_MS) return { show: false, reason: 'cooldown' };

  const nextOpportunity = state.lockedOpportunities + 1;
  state.lockedOpportunities = nextOpportunity;
  state.seenOpportunities[objectKey] = now;
  const isFirstHighValueMoment = state.lockedOpportunities === 1;
  const cadenceHit = nextOpportunity % CADENCE === 0;

  if (!isFirstHighValueMoment && !cadenceHit && input.trigger !== 'insufficient_quarks') {
    writeState(input.playerId, state);
    return { show: false, reason: 'cadence' };
  }

  state.shownToday += 1;
  state.lastShownAt = now;
  state.shownObjects[objectKey] = now;
  const video = pickNextAlphaPromoVideoForPlayer(input.playerId);
  writeState(input.playerId, state);
  setSessionCount(sessionCount + 1);

  return { show: true, reason: 'allowed', video };
}

export function markAlphaPromoOpportunity(input: Omit<AlphaPromoDecisionInput, 'now'> & { now?: number }): AlphaPromoDecision {
  return shouldShowAlphaPromo(input);
}
