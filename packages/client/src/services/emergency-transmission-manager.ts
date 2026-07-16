export type EmergencyTransmissionSource = 'youtube';

import { authFetch } from '../auth/api-client.js';
import i18n from '../i18n/index.js';

export interface EmergencyTransmissionEpisode {
  id: string;
  title: string;
  summary: string;
  source: EmergencyTransmissionSource;
  youtubeId: string;
  releasedAt: string;
}

interface EmergencyTransmissionStoredState {
  seenEpisodes: Record<string, number>;
}

const STORAGE_PREFIX = 'nebulife_emergency_transmissions';
const PENDING_PREFIX = 'nebulife_emergency_transmission_pending';
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const COMPATIBILITY_EPISODE = {
    id: 'frontier-dispatch-001',
    source: 'youtube',
    youtubeId: 'Keu09e2e0I4',
    releasedAt: '2026-06-23T00:00:00.000Z',
} as const;

function storageKey(playerId: string): string {
  return `${STORAGE_PREFIX}_${playerId || 'local'}`;
}

function emptyState(): EmergencyTransmissionStoredState {
  return { seenEpisodes: {} };
}

function readState(playerId: string): EmergencyTransmissionStoredState {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(playerId)) ?? 'null') as Partial<EmergencyTransmissionStoredState> | null;
    if (!parsed || typeof parsed !== 'object') return emptyState();
    return {
      seenEpisodes: parsed.seenEpisodes && typeof parsed.seenEpisodes === 'object'
        ? parsed.seenEpisodes as Record<string, number>
        : {},
    };
  } catch {
    return emptyState();
  }
}

function writeState(playerId: string, state: EmergencyTransmissionStoredState): void {
  try {
    localStorage.setItem(storageKey(playerId), JSON.stringify(state));
  } catch {
    // Emergency dispatch cadence is non-critical UI state.
  }
}

export function buildYouTubeEmbedUrl(youtubeId: string): string {
  if (!YOUTUBE_ID_PATTERN.test(youtubeId)) return 'about:blank';
  const params = new URLSearchParams({
    autoplay: '1',
    mute: '1',
    controls: '0',
    playsinline: '1',
    rel: '0',
    fs: '0',
    disablekb: '1',
    iv_load_policy: '3',
    modestbranding: '1',
  });
  if (typeof window !== 'undefined' && window.location.origin) {
    params.set('origin', window.location.origin);
  }
  return `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}?${params.toString()}`;
}

function localizedCompatibilityEpisode(language: 'uk' | 'en'): EmergencyTransmissionEpisode {
  const t = i18n.getFixedT(language);
  return {
    ...COMPATIBILITY_EPISODE,
    title: t('emergency_transmission.episodes.frontier_001.title'),
    summary: t('emergency_transmission.episodes.frontier_001.summary'),
  };
}

function fallbackEpisode(playerId: string, language: 'uk' | 'en', now: number): EmergencyTransmissionEpisode | null {
  const state = readState(playerId);
  if (state.seenEpisodes[COMPATIBILITY_EPISODE.id] || Date.parse(COMPATIBILITY_EPISODE.releasedAt) > now) return null;
  state.seenEpisodes[COMPATIBILITY_EPISODE.id] = now;
  writeState(playerId, state);
  return localizedCompatibilityEpisode(language);
}

function pendingKey(playerId: string): string {
  return `${PENDING_PREFIX}_${playerId || 'local'}`;
}

function getClaimToken(playerId: string, episodeId: string): string {
  try {
    const parsed = JSON.parse(localStorage.getItem(pendingKey(playerId)) ?? 'null') as { episodeId?: string; token?: string } | null;
    if (parsed?.episodeId === episodeId && typeof parsed.token === 'string') return parsed.token;
    const token = crypto.randomUUID();
    localStorage.setItem(pendingKey(playerId), JSON.stringify({ episodeId, token }));
    return token;
  } catch {
    return crypto.randomUUID();
  }
}

function clearClaimToken(playerId: string): void {
  try { localStorage.removeItem(pendingKey(playerId)); } catch { /* non-critical */ }
}

const inFlight = new Map<string, Promise<EmergencyTransmissionEpisode | null>>();

export function requestEmergencyTransmission(input: {
  playerId: string;
  language: 'uk' | 'en';
  now?: number;
  fetcher?: typeof authFetch;
}): Promise<EmergencyTransmissionEpisode | null> {
  const existing = inFlight.get(input.playerId);
  if (existing) return existing;
  const promise = requestEmergencyTransmissionInternal(input)
    .finally(() => inFlight.delete(input.playerId));
  inFlight.set(input.playerId, promise);
  return promise;
}

async function requestEmergencyTransmissionInternal(input: {
  playerId: string;
  language: 'uk' | 'en';
  now?: number;
  fetcher?: typeof authFetch;
}): Promise<EmergencyTransmissionEpisode | null> {
  const now = input.now ?? Date.now();
  const fetcher = input.fetcher ?? authFetch;
  const legacySeenEpisodeIds = Object.keys(readState(input.playerId).seenEpisodes);
  let compatibilityFallbackAllowed = false;
  try {
    const sync = await fetcher('/api/emergency-transmissions/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ legacySeenEpisodeIds }),
    });
    if (!sync.ok) {
      compatibilityFallbackAllowed = [401, 404, 503].includes(sync.status);
      throw new Error(`sync:${sync.status}`);
    }

    const next = await fetcher(`/api/emergency-transmissions/next?language=${input.language}`);
    if (!next.ok) {
      compatibilityFallbackAllowed = [401, 404, 503].includes(next.status);
      throw new Error(`next:${next.status}`);
    }
    const data = await next.json() as { episode?: EmergencyTransmissionEpisode | null };
    if (!data.episode) return null;
    if (!YOUTUBE_ID_PATTERN.test(data.episode.youtubeId)) return null;

    const claimToken = getClaimToken(input.playerId, data.episode.id);
    const claim = await fetcher('/api/emergency-transmissions/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episodeId: data.episode.id, claimToken, legacySeenEpisodeIds }),
    });
    if (claim.status === 409) {
      clearClaimToken(input.playerId);
      return null;
    }
    if (!claim.ok) throw new Error(`claim:${claim.status}`);

    const state = readState(input.playerId);
    state.seenEpisodes[data.episode.id] = now;
    writeState(input.playerId, state);
    clearClaimToken(input.playerId);
    return data.episode;
  } catch (error) {
    // During migration/API rollout, preserve the current single episode. If a
    // claim request may have reached the backend, keep its token and retry
    // instead of risking a second display.
    if (String(error).includes('claim:') || !compatibilityFallbackAllowed) return null;
    return fallbackEpisode(input.playerId, input.language, now);
  }
}

export async function acknowledgeEmergencyTransmissionClosed(episodeId: string): Promise<void> {
  try {
    await authFetch('/api/emergency-transmissions/close', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episodeId }),
    });
  } catch {
    // Closing analytics must never trap the player in the modal.
  }
}
