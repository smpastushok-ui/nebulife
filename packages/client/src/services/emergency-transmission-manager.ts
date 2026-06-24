export type EmergencyTransmissionSource = 'youtube';

export interface EmergencyTransmissionEpisode {
  id: string;
  titleKey: string;
  summaryKey: string;
  source: EmergencyTransmissionSource;
  youtubeId: string;
  releasedAt: string;
}

interface EmergencyTransmissionStoredState {
  day: string;
  shownToday: number;
  seenEpisodes: Record<string, number>;
}

export interface EmergencyTransmissionDecision {
  show: boolean;
  reason: 'allowed' | 'session_cap' | 'daily_cap' | 'none_released';
  episode?: EmergencyTransmissionEpisode;
}

const STORAGE_PREFIX = 'nebulife_emergency_transmissions';
const SESSION_KEY = '__nebulife_emergency_transmission_session_count__';
const DAILY_SHOW_LIMIT = 1;

export const EMERGENCY_TRANSMISSION_EPISODES: readonly EmergencyTransmissionEpisode[] = [
  {
    id: 'frontier-dispatch-001',
    titleKey: 'emergency_transmission.episodes.frontier_001.title',
    summaryKey: 'emergency_transmission.episodes.frontier_001.summary',
    source: 'youtube',
    youtubeId: 'Keu09e2e0I4',
    releasedAt: '2026-06-23T00:00:00.000Z',
  },
];

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

function emptyState(now: number): EmergencyTransmissionStoredState {
  return {
    day: todayKey(now),
    shownToday: 0,
    seenEpisodes: {},
  };
}

function readState(playerId: string, now: number): EmergencyTransmissionStoredState {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(playerId)) ?? 'null') as Partial<EmergencyTransmissionStoredState> | null;
    if (!parsed || typeof parsed !== 'object') return emptyState(now);
    const day = parsed.day === todayKey(now) ? parsed.day : todayKey(now);
    return {
      day,
      shownToday: parsed.day === day && typeof parsed.shownToday === 'number' ? parsed.shownToday : 0,
      seenEpisodes: parsed.seenEpisodes && typeof parsed.seenEpisodes === 'object'
        ? parsed.seenEpisodes as Record<string, number>
        : {},
    };
  } catch {
    return emptyState(now);
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

export function shouldShowEmergencyTransmission(input: {
  playerId: string;
  now?: number;
}): EmergencyTransmissionDecision {
  const now = input.now ?? Date.now();
  if (getSessionCount() >= 1) return { show: false, reason: 'session_cap' };

  const state = readState(input.playerId, now);
  if (state.shownToday >= DAILY_SHOW_LIMIT) return { show: false, reason: 'daily_cap' };

  const episode = EMERGENCY_TRANSMISSION_EPISODES
    .filter((candidate) => Date.parse(candidate.releasedAt) <= now)
    .filter((candidate) => !state.seenEpisodes[candidate.id])
    .sort((a, b) => Date.parse(b.releasedAt) - Date.parse(a.releasedAt))[0];

  if (!episode) return { show: false, reason: 'none_released' };

  state.shownToday += 1;
  state.seenEpisodes[episode.id] = now;
  writeState(input.playerId, state);
  setSessionCount(getSessionCount() + 1);

  return { show: true, reason: 'allowed', episode };
}
