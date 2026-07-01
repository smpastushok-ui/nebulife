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
  lastVideoId?: string;
  seenOpportunities: Record<string, number>;
  shownObjects: Record<string, number>;
}

const STORAGE_PREFIX = 'nebulife_alpha_promo';
const SESSION_KEY = '__nebulife_alpha_promo_session_count__';
const DAILY_SHOW_LIMIT = 3;
const SESSION_SHOW_LIMIT = 1;
const COOLDOWN_MS = 20 * 60 * 1000;
const CADENCE = 3;
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
    lastVideoId: undefined,
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
      lastVideoId: typeof parsed.lastVideoId === 'string' ? parsed.lastVideoId : undefined,
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
  avoidVideoId?: string,
): AlphaPromoVideo {
  const available = videos.length > 0 ? videos : [FALLBACK_ALPHA_PROMO_VIDEO];
  const pool = available.length > 1 && avoidVideoId
    ? available.filter((video) => video.id !== avoidVideoId)
    : available;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? available[0] ?? FALLBACK_ALPHA_PROMO_VIDEO;
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
  const video = pickRandomAlphaPromoVideo(ALPHA_PROMO_VIDEOS, state.lastVideoId);
  state.lastVideoId = video.id;
  writeState(input.playerId, state);
  setSessionCount(sessionCount + 1);

  return { show: true, reason: 'allowed', video };
}

export function markAlphaPromoOpportunity(input: Omit<AlphaPromoDecisionInput, 'now'> & { now?: number }): AlphaPromoDecision {
  return shouldShowAlphaPromo(input);
}
